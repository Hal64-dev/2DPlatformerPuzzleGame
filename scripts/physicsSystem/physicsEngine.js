class PhysicsEngine {
  constructor(gravity = new Vec2(0, 250)) {
    this.gravity = gravity;
    this.bodies = [];

    // Constants for physics calculations
    this.EPSILON = 0.01;
    this.POSITION_CORRECTION_EPSILON = 0.001;
    this.PENETRATION_CORRECTION_MIN = 0.01;
    this.PENETRATION_CORRECTION_MAX = 0.1;
    this.VELOCITY_THRESHOLD = 0.001;
    this.MAX_ITERATIONS = 3;
  }

  addBody(body) {
    if (!this.bodies.includes(body)) this.bodies.push(body);
  }

  removeBody(body) {
    const idx = this.bodies.indexOf(body);
    if (idx !== -1) this.bodies.splice(idx, 1);
  }

  removeAllBodies() {
    this.bodies.length = 0;
  }

  update(deltaTime, tileMap) {
    for (const body of this.bodies) {
      if (body.isStatic || !body.collider?.isActive) continue;
      this._integrateForces(body, deltaTime);
      this._resolveCollisionsWithTilesAndEntities(body, tileMap, deltaTime);
    }
  }

  _integrateForces(body, deltaTime) {
    // Apply gravity force if enabled
    if (body.applyGravity) body.applyForce(this.gravity.mul(body.mass));

    // Update velocity based on accumulated forces
    const acceleration = body.force.mul(body.invMass);
    body.velocity = body.velocity.add(acceleration.mul(deltaTime));

    // Reset force accumulator and grounded state for the new frame
    body.force = Vec2.zero();
    body.isGrounded = false;
  }

  _resolveCollisionsWithTilesAndEntities(body, tileMap, deltaTime) {
    let remainingTime = 1.0;
    let iterations = 0;
    let groundedThisFrame = false;

    while (remainingTime > 0 && iterations < this.MAX_ITERATIONS) {
      iterations++;
      const velocityStep = body.velocity.mul(deltaTime * remainingTime);
      const aabb = body.collider.global;

      const collisionData = this._findEarliestTileCollision(aabb, velocityStep, tileMap);
      const collidedEntities = this._findEntityCollisions(body, aabb, velocityStep, collisionData.earliestCollisionTime);

      if (collisionData.collidedTile && collisionData.earliestCollisionTime < 1.0) {
        ({ groundedThisFrame, remainingTime } =
          this._handleCollision(
            body, velocityStep, collisionData.earliestCollisionTime,
            collisionData.normalX, collisionData.normalY,
            body.bounce, body.friction,
            collisionData.collidedTile, null, groundedThisFrame, remainingTime
          ));

        this._triggerAdditionalCollisions(body, collidedEntities, collisionData.earliestCollisionTime);
        continue;
      }

      if (collidedEntities.length > 0) {
        collidedEntities.sort((a, b) => a.t - b.t);
        const firstEntity = collidedEntities[0];

        ({ groundedThisFrame, remainingTime } =
          this._handleCollision(
            body, velocityStep, firstEntity.t,
            firstEntity.normalX, firstEntity.normalY,
            body.bounce, body.friction,
            null, firstEntity.entity, groundedThisFrame, remainingTime
          ));

        this._triggerAdditionalCollisions(body, collidedEntities.slice(1), firstEntity.t);
      } else {
        // No collisions, move freely and exit loop
        body.position = body.position.add(velocityStep);
        break;
      }
    }

    body.isGrounded = groundedThisFrame;
  }

  _findEarliestTileCollision(aabb, velocityStep, tileMap) {
    const tileSize = tileMap.tileSize;
    const minX = Math.floor((aabb.left + Math.min(0, velocityStep.x)) / tileSize);
    const maxX = Math.floor((aabb.right + Math.max(0, velocityStep.x)) / tileSize);
    const minY = Math.floor((aabb.top + Math.min(0, velocityStep.y)) / tileSize);
    const maxY = Math.floor((aabb.bottom + Math.max(0, velocityStep.y)) / tileSize);

    let earliestCollisionTime = 1.0;
    let normalX = 0, normalY = 0;
    let collidedTile = null;

    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        const tile = tileMap.getTile(tx, ty);
        if (!tile) continue;

        const isColliderActive = this._isTileColliderActive(tile);
        if (!isColliderActive) continue;

        const tileAABB = new AABB(
          tx * tileSize, ty * tileSize,
          (tx + 1) * tileSize, (ty + 1) * tileSize
        );

        const result = this._sweptAABB(aabb, velocityStep, tileAABB);
        if (result && result.t < earliestCollisionTime) {
          earliestCollisionTime = result.t;
          normalX = result.normalX;
          normalY = result.normalY;
          collidedTile = tile;
        }
      }
    }

    return { earliestCollisionTime, normalX, normalY, collidedTile };
  }

  _isTileColliderActive(tile) {
    if ('isColliderActive' in tile) {
      return tile.isColliderActive ?? tile.collider?.isActive ?? true;
    }
    return tile.collider?.isActive ?? true;
  }

  _findEntityCollisions(body, aabb, velocityStep, maxTime) {
    const collidedEntities = [];
    for (const other of this.bodies) {
      if (other === body || other.isStatic || !other.collider?.isActive || !other.entity || other.tile) continue;

      const result = this._sweptAABB(aabb, velocityStep, other.collider.global);
      if (result && result.t <= maxTime) {
        collidedEntities.push({
          entity: other.entity,
          normalX: result.normalX,
          normalY: result.normalY,
          t: result.t,
        });
      }
    }
    return collidedEntities;
  }

  _triggerAdditionalCollisions(body, entities, referenceTime) {
    for (const e of entities) {
      if (Math.abs(e.t - referenceTime) < this.POSITION_CORRECTION_EPSILON) {
        body.collider.triggerCollision(new CollisionInfo(
          e.entity, null, new Vec2(e.normalX, e.normalY)
        ));
      }
    }
  }

  _handleCollision(body, velocityStep, t, normalX, normalY, bounce, friction, tile, entity, grounded, remainingTime) {
    // Move to just before the collision point to avoid clipping
    body.position = body.position.add(velocityStep.mul(Math.max(0, t - this.POSITION_CORRECTION_EPSILON)));

    const v = body.velocity;
    const n = new Vec2(normalX, normalY);
    const velocityAlongNormal = v.dot(n);

    if (velocityAlongNormal < -this.EPSILON) {
      const newVelAlongNormal = -velocityAlongNormal * bounce;

      if (Math.abs(newVelAlongNormal) < this.EPSILON) {
        // Stop velocity along collision normal
        body.velocity = v.sub(n.mul(velocityAlongNormal));
      } else {
        // Reflect velocity with bounce
        const deltaVelNormal = newVelAlongNormal - velocityAlongNormal;
        body.velocity = v.add(n.mul(deltaVelNormal));
      }

      // Ground detection and friction application
      if (normalY < -0.7) {
        grounded = true;
        body.velocity.x *= (1 - friction);
      }
    }

    // Penetration correction to avoid clipping
    const penetrationDepth = Math.max(0, (1 - t) * velocityStep.length());
    if (penetrationDepth > this.POSITION_CORRECTION_EPSILON) {
      const pushBack = Math.min(penetrationDepth + this.PENETRATION_CORRECTION_MIN, this.PENETRATION_CORRECTION_MAX);
      body.position = body.position.add(n.mul(pushBack));
    }

    // Trigger collision events if applicable
    if (body.collider && (entity || tile)) {
      body.collider.triggerCollision(new CollisionInfo(entity, tile, n));
    }

    remainingTime *= Math.max(0, 1 - t);
    return { groundedThisFrame: grounded, remainingTime };
  }

  _sweptAABB(movingAABB, velocity, staticAABB) {
    // If velocity is negligible, treat as static overlap check
    if (Math.abs(velocity.x) < this.VELOCITY_THRESHOLD &&
      Math.abs(velocity.y) < this.VELOCITY_THRESHOLD) {
      return movingAABB.intersects(staticAABB)
        ? { t: 0, normalX: 0, normalY: -1 }
        : null;
    }

    // Calculate entry and exit distances on each axis
    const invEntry = { x: 0, y: 0 };
    const invExit = { x: 0, y: 0 };

    if (velocity.x > 0) {
      invEntry.x = staticAABB.left - movingAABB.right;
      invExit.x = staticAABB.right - movingAABB.left;
    } else {
      invEntry.x = staticAABB.right - movingAABB.left;
      invExit.x = staticAABB.left - movingAABB.right;
    }

    if (velocity.y > 0) {
      invEntry.y = staticAABB.top - movingAABB.bottom;
      invExit.y = staticAABB.bottom - movingAABB.top;
    } else {
      invEntry.y = staticAABB.bottom - movingAABB.top;
      invExit.y = staticAABB.top - movingAABB.bottom;
    }

    // Calculate entry and exit times for each axis
    const entry = {
      x: velocity.x === 0 ? -Infinity : invEntry.x / velocity.x,
      y: velocity.y === 0 ? -Infinity : invEntry.y / velocity.y
    };
    const exit = {
      x: velocity.x === 0 ? Infinity : invExit.x / velocity.x,
      y: velocity.y === 0 ? Infinity : invExit.y / velocity.y
    };

    const entryTime = Math.max(entry.x, entry.y);
    const exitTime = Math.min(exit.x, exit.y);

    // Check if there is no collision
    if (entryTime > exitTime ||
      (entry.x < 0 && entry.y < 0) ||
      entry.x > 1 || entry.y > 1) {
      return null;
    }

    // Determine collision normal based on axis of first contact
    let normalX = 0, normalY = 0;

    if (entry.x > entry.y) {
      // Check vertical overlap at collision time
      if (!this._overlapsOnAxis(
        movingAABB.top + velocity.y * entryTime,
        movingAABB.bottom + velocity.y * entryTime,
        staticAABB.top,
        staticAABB.bottom
      )) return null;

      normalX = invEntry.x < 0 ? 1 : -1;
    } else {
      // Check horizontal overlap at collision time
      if (!this._overlapsOnAxis(
        movingAABB.left + velocity.x * entryTime,
        movingAABB.right + velocity.x * entryTime,
        staticAABB.left,
        staticAABB.right
      )) return null;

      normalY = invEntry.y < 0 ? 1 : -1;
    }

    return { t: entryTime, normalX, normalY };
  }

  _overlapsOnAxis(minA, maxA, minB, maxB) {
    // Return true if intervals [minA, maxA] and [minB, maxB] overlap
    return maxA > minB && minA < maxB;
  }
}

const ANIMATION_RATE = 8
const GRAVITY = 0.55

class Resolution {
    constructor() {
        this.resolve = false
        this.delta = 0
        this.finite = false
    }
}

class Thing {
    constructor(world, uid, sprite_name, x, y) {
        this.half_width = 6
        this.height = 31
        this.uid = uid
        this.animations = SPRITES[sprite_name]
        this.sprite_id = sprite_name
        this.sprite = this.animations["idle"]
        this.mirror = false
        this.frame = 0
        this.frame_modulo = 0
        this.x = x
        this.y = y
        this.dx = 0
        this.dy = 0
        this.ground = false
        world.add_thing(this)
        this.block_borders()
        this.add_to_blocks(world)
    }
    block_borders() {
        this.left_gx = Math.floor((this.x - this.half_width) * INV_GRID_SIZE)
        this.right_gx = Math.floor((this.x + this.half_width) * INV_GRID_SIZE)
        this.bottom_gy = Math.floor(this.y * INV_GRID_SIZE)
        this.top_gy = Math.floor((this.y + this.height) * INV_GRID_SIZE)
    }
    add_to_blocks(world) {
        for (let gx = this.left_gx; gx <= this.right_gx; gx++) {
            for (let gy = this.bottom_gy; gy <= this.top_gy; gy++) {
                world.get_block(gx, gy).add_thing(this)
            }
        }
    }
    remove_from_blocks(world) {
        for (let gx = this.left_gx; gx <= this.right_gx; gx++) {
            for (let gy = this.bottom_gy; gy <= this.top_gy; gy++) {
                world.get_block(gx, gy).remove_thing(this)
            }
        }
    }
    damage() {}
    update(world) {
        if (!this.ground) this.dy -= GRAVITY
        this.x += this.dx
        this.y += this.dy
        this.remove_from_blocks(world)
        this.tile_collision(world)
        this.block_borders()
        this.add_to_blocks(world)

        if (this.ground)
            this.dx = 0
    }
    tile_x_collision(world, res) {
        let bottom_gy = Math.floor(this.y * INV_TILE_SIZE)
        let top_gy = Math.floor((this.y + this.height) * INV_TILE_SIZE)
        res.finite = true
        res.resolve = false
        if (this.dx > 0) {
            let gx = Math.floor((this.x + this.half_width) * INV_TILE_SIZE)
            for (let gy = bottom_gy; gy <= top_gy; gy++) {
                if (TILE_EMPTY[world.get_tile(gx, gy)])
                    continue
                res.resolve = true
                res.delta = gx * TILE_SIZE - this.half_width
                if (!TILE_EMPTY[world.get_tile(gx - 1, gy)]) {
                    res.finite = false
                    return
                }
            }
        } else {
            let gx = Math.floor((this.x - this.half_width) * INV_TILE_SIZE)
            for (let gy = bottom_gy; gy <= top_gy; gy++) {
                let tile = world.get_tile(gx, gy)
                if (TILE_EMPTY[tile])
                    continue
                res.resolve = true
                res.delta = (gx + 1) * TILE_SIZE + this.half_width
                if (!TILE_EMPTY[world.get_tile(gx + 1, gy)]) {
                    res.finite = false
                    return
                }
            }
        }
    }
    tile_y_collision(world, res) {
        let left_gx = Math.floor((this.x - this.half_width) * INV_TILE_SIZE)
        let right_gx = Math.floor((this.x + this.half_width - 1) * INV_TILE_SIZE)
        res.finite = true
        res.resolve = false
        if (this.dy > 0) {
            res.resolve = false
        } else {
            let gy = Math.floor(this.y * INV_TILE_SIZE)
            for (let gx = left_gx; gx <= right_gx; gx++) {
                if (TILE_EMPTY[world.get_tile(gx, gy)])
                    continue
                res.resolve = true
                res.delta = (gy + 1) * TILE_SIZE
                if (!TILE_EMPTY[world.get_tile(gx, gy + 1)]) {
                    res.finite = false
                    return
                }
            }
        }
    }
    check_ground(world) {
        let left_gx = Math.floor((this.x - this.half_width) * INV_TILE_SIZE)
        let right_gx = Math.floor((this.x + this.half_width) * INV_TILE_SIZE)
        let gy = Math.floor((this.y - 1) * INV_TILE_SIZE)
        for (let gx = left_gx; gx <= right_gx; gx++) {
            let t = world.get_tile(gx, gy)
            if (TILE_EMPTY[t])
                continue
            return true
        }
        return false
    }
    tile_collision(world) {
        let dxx = new Resolution()
        let dyy = new Resolution()
        this.tile_x_collision(world, dxx)
        this.tile_y_collision(world, dyy)

        let ground = false

        if (dxx.resolve) {
            if (dyy.resolve) {
                if (!dxx.finite && !dyy.finite) {
                    this.x = dxx.delta
                    this.y = dyy.delta
                    if (this.dy < 0) ground = true
                    this.dx = 0
                    this.dy = 0
                } else if (dxx.finite && !dyy.finite) {
                    this.x = dxx.delta
                    this.dx = 0
                    this.tile_y_collision(world, dyy)
                    if (dyy.resolve && dyy.finite) {
                        this.y = dyy.delta
                        if (this.dy < 0) ground = true
                        this.dy = 0
                    }
                } else if (dyy.finite && !dxx.finite) {
                    this.y = dyy.delta
                    if (this.dy < 0) ground = true
                    this.dy = 0
                    this.tile_x_collision(world, dxx)
                    if (dxx.resolve && dxx.finite) {
                        this.x = dxx.delta
                        this.dx = 0
                    }
                } else if (Math.abs(dxx.delta - this.x) < Math.abs(dyy.delta - this.y)) {
                    this.x = dxx.delta
                    this.dx = 0
                    this.tile_y_collision(world, dyy)
                    if (dyy.resolve && dyy.finite) {
                        this.y = dyy.delta
                        if (this.dy < 0) ground = true
                        this.dy = 0
                    }
                } else {
                    this.y = dyy.delta
                    if (this.dy < 0) ground = true
                    this.dy = 0
                    this.tile_x_collision(world, dxx)
                    if (dxx.resolve && dxx.finite) {
                        this.x = dxx.delta
                        this.dx = 0
                    }
                }
            } else {
                this.x = dxx.delta
                this.dx = 0
                this.tile_y_collision(world, dyy)
                if (dyy.resolve && dyy.finite) {
                    this.y = dyy.delta
                    if (this.dy < 0) ground = true
                    this.dy = 0
                }
            }
        } else if (dyy.resolve) {
            this.y = dyy.delta
            if (this.dy < 0) ground = true
            this.dy = 0
            this.tile_x_collision(world, dxx)
            if (dxx.resolve && dxx.finite) {
                this.x = dxx.delta
                this.dx = 0
            }
        }

        if (dyy.resolve) this.ground = ground
        else if (this.ground) this.ground = this.check_ground(world)
    }
    resolve_collision_thing(b) {
        if (!this.overlap_thing(b)) return

        let old_x = this.x - this.dx
        let old_y = this.y - this.dy

        if (Math.abs(old_x - b.x) > Math.abs(old_y - b.y)) {
            if (old_x - b.x < 0) this.x = b.x - this.half_width - b.half_width
            else this.x = b.x + this.half_width + b.half_width
            this.dx = 0
        } else {
            if (old_y - b.y < 0) this.y = b.y - this.height
            else {
                this.y = b.y + b.height
                this.ground = true
            }
            this.dy = 0
        }
    }
    overlap_boxes(boxes) {
        for (let i in boxes) {
            let box = boxes[i]
            if (this.x + this.half_width > box.x && this.x - this.half_width < box.x + box.width &&
                this.y + this.height > box.y && this.y < box.y + box.height)
                return true
        }
        return false
    }
    overlap_thing(thing) {
        return this.x + this.half_width > thing.x - thing.half_width && this.x - this.half_width < thing.x + thing.half_width &&
            this.y + this.height > thing.y && this.y < thing.y + thing.height
    }
    thing_collision(world) {
        let collided = new Array()
        let searched = new Set()

        for (let gx = this.left_gx; gx <= this.right_gx; gx++) {
            for (let gy = this.bottom_gy; gy <= this.top_gy; gy++) {
                let block = world.get_block(gx, gy)
                for (let i = 0; i < block.thing_count; i++) {
                    let thing = block.things[i]
                    if (searched.has(thing)) continue
                    if (this.overlap_thing(thing)) collided.push(thing)
                    searched.add(thing)
                }
            }
        }

        let old_x = this.x - this.dx
        let old_y = this.y - this.dy
        while (collided.length > 0) {
            let closest = null
            let manhattan = Number.MAX_VALUE
            for (let i = 0; i < collided.length; i++) {
                let thing = collided[i]
                let dist = Math.abs(old_x - thing.x) + Math.abs(old_y - thing.y)
                if (dist < manhattan) {
                    manhattan = dist
                    closest = thing
                }
            }
            this.resolve_collision_thing(closest)
            collided.splice(closest)
        }
    }
    save(x, y) {
        return `{"id":"${this.uid}","x":${Math.floor(this.x - x)},"y":${Math.floor(this.y - y)}}`
    }
}
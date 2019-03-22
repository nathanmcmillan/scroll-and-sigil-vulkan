const BaronAnimationIdle = []
const BaronAnimationWalk = []
const BaronAnimationMelee = []
const BaronAnimationMissile = []
const BaronAnimationDeath = []

const BaronSleep = 0
const BaronDead = 1
const BaronLook = 2
const BaronChase = 3
const BaronMelee = 4
const BaronMissile = 5

class Baron extends Thing {
    constructor(world, nid, x, y, z) {
        super()
        this.World = world
        this.UID = "baron"
        this.SID = "baron"
        this.NID = nid
        this.Update = this.BaronUpdate
        this.Animation = BaronAnimationWalk
        this.X = x
        this.Y = y
        this.Z = z
        this.OX = x
        this.OY = y
        this.OZ = z
        this.Radius = 0.4
        this.Height = 1.0
        this.Speed = 0.1
        this.Health = 1
        this.Status = BaronSleep
        world.AddThing(this)
        this.BlockBorders()
        this.AddToBlocks()
    }
    NetUpdateState(status) {
        this.AnimationMod = 0
        this.AnimationFrame = 0
        switch (status) {
            case BaronDead:
                this.Animation = BaronAnimationDeath
                break
            case BaronMelee:
                this.Animation = BaronAnimationMelee
                Sounds["baron-melee"].play()
                break
            case BaronMissile:
                this.Animation = BaronAnimationMissile
                Sounds["baron-missile"].play()
                break
            case BaronChase:
                Sounds["baron-scream"].play()
                for (let i = 0; i < 20; i++) {
                    let spriteName = "blood-" + Math.floor(Math.random() * 3)

                    let x = this.X + this.Radius * (1 - Math.random() * 2)
                    let y = this.Y + this.Height * Math.random()
                    let z = this.Z + this.Radius * (1 - Math.random() * 2)

                    const spread = 0.2

                    let dx = spread * (1 - Math.random() * 2)
                    let dy = spread * Math.random()
                    let dz = spread * (1 - Math.random() * 2)

                    new Blood(this.World, x, y, z, dx, dy, dz, spriteName)
                }
                break
            default:
                this.Animation = BaronAnimationWalk
                break
        }
        this.Status = status
    }
    Damage(amount) {
        this.Health -= amount
        if (this.Health <= 0)
            Sounds["baron-death"].play()
        else
            Sounds["baron-pain"].play()
    }
    Dead() {
        if (this.AnimationFrame === this.Animation.length - 1) {
            this.Update = this.EmptyUpdate
        } else {
            this.UpdateAnimation()
        }
    }
    Look() {
        if (this.UpdateAnimation() === AnimationDone) {
            this.AnimationFrame = 0
        }
    }
    Melee() {
        if (this.UpdateAnimation() === AnimationDone) {
            this.AnimationFrame = 0
            this.Animation = BaronAnimationWalk
        }
    }
    Missile() {
        if (this.UpdateAnimation() === AnimationDone) {
            this.AnimationFrame = 0
            this.Animation = BaronAnimationWalk
        }
    }
    Chase() {
        if (this.UpdateAnimation() === AnimationDone) {
            this.AnimationFrame = 0
        }
    }
    BaronUpdate() {
        switch (this.Status) {
            case BaronDead:
                this.Dead()
                break
            case BaronLook:
                this.Look()
                break
            case BaronMelee:
                this.Melee()
                break
            case BaronMissile:
                this.Missile()
                break
            case BaronChase:
                this.Chase()
                break
        }
    }
    EmptyUpdate() {}
}
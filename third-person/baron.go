package main

import (
	"math"
	"strconv"
)

// Animation constants
const (
	BaronWalkAnimation    int = 2
	BaronMeleeAnimation   int = 2
	BaronMissileAnimation int = 3
	BaronDeathAnimation   int = 2
)

// Baron constants
const (
	BaronSleep   = 0
	BaronDead    = 1
	BaronLook    = 2
	BaronChase   = 3
	BaronMelee   = 4
	BaronMissile = 5
)

// Baron struct
type Baron struct {
	*Npc
	Status       int
	Reaction     int
	MeleeRange   float32
	MissileRange float32
}

// NewBaron func
func NewBaron(world *World, x, y, z float32) *Baron {
	baron := &Baron{}
	baron.Npc = &Npc{}
	baron.Thing = &Thing{}
	baron.UID = "baron"
	baron.NID = NextNID()
	baron.World = world
	baron.Thing.Update = baron.Update
	baron.Thing.Damage = baron.Damage
	baron.X = x
	baron.Y = y
	baron.Z = z
	baron.Radius = 0.4
	baron.Height = 1.0
	baron.Animation = BaronWalkAnimation
	baron.Health = 1
	baron.Speed = 0.1
	baron.MoveDirection = DirectionNone
	baron.Status = BaronLook
	baron.MeleeRange = 2.9
	baron.MissileRange = 10.1
	world.AddThing(baron.Thing)
	baron.BlockBorders()
	baron.AddToBlocks()
	return baron
}

// MeleeAttack func
func (me *Baron) MeleeAttack() {
	if me.ApproximateDistance(me.Target) <= me.MeleeRange {
		me.Target.Damage(1 + NextRandP()%3)
	}
}

// ThrowMissile func
func (me *Baron) ThrowMissile() {
	const speed = 0.3
	angle := math.Atan2(float64(me.Target.Z-me.Z), float64(me.Target.X-me.X))
	dx := float32(math.Cos(angle))
	dz := float32(math.Sin(angle))
	dist := me.ApproximateDistance(me.Target)
	dy := (me.Target.Y + me.Target.Height*0.5 - me.Y - me.Height*0.5) / (dist / speed)
	x := me.X + dx*me.Radius*2.0
	y := me.Y + me.Height*0.5
	z := me.Z + dz*me.Radius*2.0
	NewPlasma(me.World, 1+NextRandP()%3, x, y, z, dx*speed, dy, dz*speed)
}

// Damage func
func (me *Baron) Damage(amount int) {
	if me.Status != BaronDead {
		me.Health -= amount
		if me.Health < 1 {
			me.Status = BaronDead
			me.AnimationMod = 0
			me.AnimationFrame = 0
			me.Animation = BaronDeathAnimation
			// client death sound
			me.RemoveFromBlocks()
		} else {
			// client pain sound
		}

		// client blood particles
	}
}

// Dead func
func (me *Baron) Dead() {
	if me.AnimationFrame < me.Animation-1 {
		me.UpdateAnimation()
	}
}

// Look func
func (me *Baron) Look() {
	for i := 0; i < me.World.ThingCount; i++ {
		thing := me.World.Things[i]
		if me.Thing == thing {
			continue
		}
		if thing.Health > 0 {
			me.Target = thing
			me.Status = BaronChase
			return
		}
	}
	if me.UpdateAnimation() == AnimationDone {
		me.AnimationFrame = 0
	}
}

// Melee func
func (me *Baron) Melee() {
	anim := me.UpdateAnimation()
	if anim == AnimationAlmostDone {
		me.Reaction = 40 + NextRandP()%220
		me.MeleeAttack()
	} else if anim == AnimationDone {
		me.AnimationFrame = 0
		me.Status = BaronChase
		me.Animation = BaronWalkAnimation
	}
}

// Missile func
func (me *Baron) Missile() {
	anim := me.UpdateAnimation()
	if anim == AnimationAlmostDone {
		me.Reaction = 40 + NextRandP()%220
		me.ThrowMissile()
	} else if anim == AnimationDone {
		me.AnimationFrame = 0
		me.Status = BaronChase
		me.Animation = BaronWalkAnimation
	}
}

// Chase func
func (me *Baron) Chase() {
	if me.Reaction > 0 {
		me.Reaction--
	}
	if me.Target == nil || me.Target.Health <= 0 {
		me.Target = nil
		me.Status = BaronLook
	} else {
		dist := me.ApproximateDistance(me.Target)
		if me.Reaction == 0 && dist < me.MeleeRange {
			me.Status = BaronMelee
			me.AnimationMod = 0
			me.AnimationFrame = 0
			me.Animation = BaronMeleeAnimation
			// client melee sound
		} else if me.Reaction == 0 && dist <= me.MissileRange {
			me.Status = BaronMissile
			me.AnimationMod = 0
			me.AnimationFrame = 0
			me.Animation = BaronMissileAnimation
			// client missile sound
		} else {
			me.MoveCount--
			if me.MoveCount < 0 || !me.Move() {
				me.NewDirection()
			}
			if me.UpdateAnimation() == AnimationDone {
				me.AnimationFrame = 0
			}
		}
	}
}

// Update func
func (me *Baron) Update() {
	switch me.Status {
	case BaronDead:
		me.Dead()
	case BaronLook:
		me.Look()
	case BaronMelee:
		me.Melee()
	case BaronMissile:
		me.Missile()
	case BaronChase:
		me.Chase()
	}
	me.Integrate()

	me.World.Snapshot.WriteString("{n:")
	me.World.Snapshot.WriteString(me.NID)
	me.World.Snapshot.WriteString(",x:")
	me.World.Snapshot.WriteString(strconv.FormatFloat(float64(me.X), 'f', -1, 32))
	me.World.Snapshot.WriteString(",y:")
	me.World.Snapshot.WriteString(strconv.FormatFloat(float64(me.Y), 'f', -1, 32))
	me.World.Snapshot.WriteString(",z:")
	me.World.Snapshot.WriteString(strconv.FormatFloat(float64(me.Z), 'f', -1, 32))
	me.World.Snapshot.WriteString(",d:")
	me.World.Snapshot.WriteString(strconv.Itoa(me.MoveDirection))
	me.World.Snapshot.WriteString("},")
}

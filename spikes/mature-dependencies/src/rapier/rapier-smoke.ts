import * as RAPIER from "@dimforge/rapier3d-compat";

export interface PackageImportProbe {
  ok: boolean;
  error?: string;
}

export interface RapierSmokeResult {
  packageName: "@dimforge/rapier3d-compat";
  packageVersion: string;
  basePackageImport: PackageImportProbe;
  worldStepped: boolean;
  dynamicBodyY: number;
  raycastHit: boolean;
  contactEvents: number;
  triggerEvents: number;
  adapterBoundary: string;
}

export async function probeBaseRapierImport(): Promise<PackageImportProbe> {
  try {
    await import(/* @vite-ignore */ "@dimforge/rapier3d");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    };
  }
}

export async function runRapierSmoke(): Promise<RapierSmokeResult> {
  await RAPIER.init();

  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const events = new RAPIER.EventQueue(true);
  const activeEvents = RAPIER.ActiveEvents.COLLISION_EVENTS;

  const ground = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
  const groundCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(2, 0.25, 2).setActiveEvents(activeEvents),
    ground
  );

  const trigger = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.75, 0));
  const triggerCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.75, 0.25, 0.75).setSensor(true).setActiveEvents(activeEvents),
    trigger
  );

  const ball = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2.5, 0));
  const ballCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.25).setActiveEvents(activeEvents),
    ball
  );

  let contactEvents = 0;
  let triggerEvents = 0;

  for (let step = 0; step < 180; step += 1) {
    world.step(events);
    events.drainCollisionEvents((handleA, handleB, started) => {
      if (!started) {
        return;
      }

      if (handleA === triggerCollider.handle || handleB === triggerCollider.handle) {
        triggerEvents += 1;
        return;
      }

      if (
        (handleA === groundCollider.handle && handleB === ballCollider.handle) ||
        (handleA === ballCollider.handle && handleB === groundCollider.handle)
      ) {
        contactEvents += 1;
      }
    });
  }

  const ray = new RAPIER.Ray({ x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 });
  const raycast = world.castRay(ray, 10, true);
  const translation = ball.translation();

  return {
    packageName: "@dimforge/rapier3d-compat",
    packageVersion: RAPIER.version(),
    basePackageImport: await probeBaseRapierImport(),
    worldStepped: true,
    dynamicBodyY: Number(translation.y.toFixed(3)),
    raycastHit: raycast !== null,
    contactEvents,
    triggerEvents,
    adapterBoundary: "Sinan PhysicsAdapter contract -> Rapier adapter -> Rapier world"
  };
}

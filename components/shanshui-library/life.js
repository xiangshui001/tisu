import { C } from './voxel.js';
import { isPond } from './landscape.js';

export function createLife(v) {
  const { box: b, group, pick, rnd } = v;
  const people = [], fish = [], birds = [];
  function reader(name, x, y, z, angle = 0, robe = '#657c7a', seated = true, parent = v.root) {
    const g = group(name, parent, x, y, z, angle), s = .19;
    function p(x, y, z, w, h, d, c) { b(g, x * s, y * s, z * s, w * s, h * s, d * s, c); }
    const h = seated ? .7 : 2.6, lift = seated ? 1.5 : 0;
    // Robes, belt, crossed lap / standing legs, hair bun and an open stitched book.
    p(0, 4 + h, 0, 3.5, 4.2, 2.6, robe);
    p(0, seated ? 3.1 : 1.9 + h, .1, 4.5, 1.4, 3.3, robe);
    p(0, 3 + h, 1.4, 3.7, .42, .24, C.paper);
    p(0, 6.8 + h, .05, 2.7, 2.5, 2.4, '#d5ad83');
    p(0, 8.1 + h, -.1, 2.85, .9, 2.5, C.woodDark);
    p(0, 8.95 + h, -.5, 1.2, .9, 1.3, C.ink);
    p(.67, 6.95 + h, 1.3, .27, .26, .13, C.ink);
    p(-.67, 6.95 + h, 1.3, .27, .26, .13, C.ink);
    p(0, 6.3 + h, 1.35, .55, .14, .13, '#9b755b');
    for (const side of [-1, 1]) {
      p(side * 2.1, 4.45 + h, .72, 1.5, 2.1, 2.2, robe);
      p(side * 1.62, 3.9 + h + lift, 2, 1.1, .7, .9, '#d5ad83');
      p(side * 1.17, seated ? 2.8 : 1.4, seated ? 1.8 : .15, 1.6, seated ? 1.2 : 2.8, seated ? 3 : 1.7, robe);
      if (seated) p(side * 1.17, 1.4, 2.65, 1.45, 2.5, 1.2, robe);
      p(side * 1.17, .36, seated ? 3.1 : .65, 1.65, .65, 2, C.ink);
      p(side * 1.12, 4.02 + h + lift, 2.4, 2.1, .36, 2.2, C.paper);
      for (let j = 0; j < 3; j++) p(side * 1.1, 4.22 + h + lift, 1.65 + j * .58, 1.4, .07, .13, '#858774');
    }
    p(0, 3.98 + h + lift, 2.4, .15, .23, 2.35, C.gold);
    people.push({ name, group: g }); return g;
  }
  function koi(x, z, rx, rz, phase, color, size = 1) {
    const g = group('游动锦鲤'); g.scale.setScalar(size);
    g.userData.batchRoot = true;
    b(g, 0, 0, 0, .43, .25, .88, color);
    b(g, 0, .015, .46, .33, .23, .32, '#e3d7b6');
    b(g, -.09, .145, .18, .2, .035, .23, '#bb583c');
    b(g, .09, .145, -.23, .23, .035, .22, color === '#d8c9a3' ? '#bd6747' : '#ecd8b0');
    for (const side of [-1, 1]) {
      b(g, side * .25, -.005, -.03, .19, .075, .27, '#d8bf91');
      b(g, side * .16, .08, .5, .06, .07, .055, C.ink);
    }
    const tail = group('摆尾', g, 0, 0, -.54);
    tail.userData.batchRoot = true;
    b(tail, 0, 0, -.15, .2, .11, .36, color);
    b(tail, 0, 0, -.32, .48, .09, .18, '#ce9663');
    fish.push({ g, tail, x, z, rx, rz, phase, speed: .13 + rnd() * .1 });
  }
  koi(-10, 9, 4.2, 3.0, 0, '#c97845', 1.3); koi(-10, 9, 4.2, 3.0, 2, '#d8c9a3', 1.1);
  koi(-8, 17, 3, 2.6, 4.2, '#b5683e', 1.35); koi(13, 3, 3.2, 2.3, 1, '#d8c9a3', 1.2);
  koi(13, 3, 3.2, 2.3, 3.8, '#c97845', 1.35); koi(12, 23, 2.8, 1.1, 1.6, '#e0cba2', 1.1);
  koi(-18, 4, 1.8, 2.8, 2.5, '#b86542', 1.0); koi(-2, 23, 2.4, 1.3, 3, '#c57842', 1.2);
  function bird(x, y, z, phase, perched = false) {
    const g = group(perched ? '枝头小鸟' : '掠水白鹭');
    g.userData.batchRoot = true;
    const c = perched ? '#8c6b4c' : '#dddcca';
    b(g, 0, 0, 0, .25, .28, .65, c); b(g, 0, .18, .33, .21, .29, .26, c);
    b(g, 0, .19, .59, .085, .08, .26, '#b98b4b');
    for (const s of [-1, 1]) b(g, s * .11, .26, .41, .035, .038, .045, C.ink);
    const left = group('左翼', g), right = group('右翼', g);
    left.userData.batchRoot = true; right.userData.batchRoot = true;
    for (const [wing, s] of [[left, -1], [right, 1]]) {
      for (let j = 0; j < 5; j++) b(wing, s * (.17 + j * .18), 0, -.04 - j * .06, .22, .1, .44 - j * .045, j < 3 ? c : '#536560');
      b(g, s * .075, -.18, -.24, .045, .3, .045, '#9c7152');
    }
    b(g, 0, -.04, -.46, .2, .1, .4, c);
    birds.push({ g, left, right, x, y, z, phase, perched });
  }
  bird(-4, 18.5, -8, 0); bird(6, 20.5, 1, 1.5); bird(12, 17, 12, 2.7);
  bird(-36, 7, 10, .6, true); bird(33, 8.6, 24, 2, true); bird(4.7, 2.95, 2.7, 0, true);
  function update(time) {
    for (const f of fish) {
      const a = time * f.speed + f.phase;
      const x = f.x + Math.cos(a) * f.rx, z = f.z + Math.sin(a) * f.rz;
      // Keep the entire fish off stone banks even when animation is sampled far ahead.
      f.g.visible = isPond(x, z) && isPond(x + .65, z) && isPond(x - .65, z);
      f.g.position.set(x, -.025 + Math.sin(a * 3) * .014, z);
      f.g.rotation.y = Math.atan2(-Math.sin(a) * f.rx, Math.cos(a) * f.rz);
      f.tail.rotation.y = Math.sin(time * 4.7 + f.phase) * .35;
    }
    for (const bird of birds) {
      const a = time * .13 + bird.phase;
      if (bird.perched) {
        bird.g.position.set(bird.x, bird.y, bird.z); bird.g.rotation.y = bird.phase;
        bird.left.rotation.z = 1.22; bird.right.rotation.z = -1.22;
      } else {
        bird.g.position.set(bird.x + Math.cos(a) * 9, bird.y + Math.sin(a * 2) * .6, bird.z + Math.sin(a) * 6);
        bird.g.rotation.y = Math.atan2(-Math.sin(a) * 9, Math.cos(a) * 6);
        bird.left.rotation.z = .15 + Math.sin(time * 3.2 + bird.phase) * .45;
        bird.right.rotation.z = -bird.left.rotation.z;
      }
    }
  }
  return { reader, people, fish, birds, update };
}

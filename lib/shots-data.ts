import type { Shot } from "./types";

/**
 * The canonical catalog of cricket shots.
 * Used by the seed script (to populate Firestore) and by the mock inference
 * route (to produce plausible predictions without a live database).
 * `id` is a stable slug so it can double as the Firestore document id and the
 * Storage thumbnail key (/shot-thumbnails/{id}.jpg).
 */
export const SHOTS: Shot[] = [
  {
    id: "cover-drive",
    name: "Cover Drive",
    category: "attacking",
    description:
      "An elegant front-foot drive played through the cover region against a full-length delivery outside off stump.",
    techniqueNotes:
      "Step towards the pitch of the ball with the front foot, head over the ball, and present the full face of the bat. Hands lead through the line and the follow-through finishes high towards cover.",
    commonMistakes:
      "Reaching for the ball with hands away from the body, planting the front foot too early, and falling over to the off side.",
    thumbnailUrl: "",
    order: 1,
  },
  {
    id: "off-drive",
    name: "Off Drive",
    category: "attacking",
    description:
      "A front-foot drive hit straight down the off side, between mid-off and cover, against a full delivery on or just outside off stump.",
    techniqueNotes:
      "Front foot to the pitch of the ball, weight transferring forward, elbow high and bat swinging straight down the line of the ball.",
    commonMistakes:
      "Closing the bat face too early and dragging the shot squarer than intended; head falling away from the line.",
    thumbnailUrl: "",
    order: 2,
  },
  {
    id: "on-drive",
    name: "On Drive",
    category: "attacking",
    description:
      "A classical front-foot drive played through mid-on against a full delivery on middle-and-leg, regarded as one of the hardest shots to master.",
    techniqueNotes:
      "Front foot points down the pitch, hips open slightly, and the bat swings through the line so the ball travels between mid-on and the bowler.",
    commonMistakes:
      "Front foot landing across and blocking the swing path, causing a leading edge or a closed-face flick.",
    thumbnailUrl: "",
    order: 3,
  },
  {
    id: "straight-drive",
    name: "Straight Drive",
    category: "attacking",
    description:
      "A textbook drive hit straight back past the bowler against a full, straight delivery — the most balanced shot in the game.",
    techniqueNotes:
      "Head still and directly over the ball, front foot to the pitch, and a vertical bat swing finishing with the full face pointing down the ground.",
    commonMistakes:
      "Leaning back at contact, hitting too early, or letting the bottom hand dominate and pull the ball to the leg side.",
    thumbnailUrl: "",
    order: 4,
  },
  {
    id: "pull-shot",
    name: "Pull Shot",
    category: "attacking",
    description:
      "A cross-batted shot played to a short-pitched delivery, pulled around to the leg side between mid-wicket and square leg.",
    techniqueNotes:
      "Rock back and across onto the back foot, get on top of the bounce, and swing across the line rolling the wrists to keep the ball down.",
    commonMistakes:
      "Playing the ball too early or too square, top-edging by failing to get on top of the bounce, and losing balance on the back foot.",
    thumbnailUrl: "",
    order: 5,
  },
  {
    id: "hook-shot",
    name: "Hook Shot",
    category: "pace",
    description:
      "An aggressive cross-batted shot to a steeply rising short ball aimed at the head, hooked round to the leg side behind square.",
    techniqueNotes:
      "Sway inside the line, swivel on the back foot, and swing across and over the ball, controlling the roll of the wrists to manage risk.",
    commonMistakes:
      "Taking eyes off the ball, mistiming the swivel, and top-edging to fine leg — a high-risk shot if balance is lost.",
    thumbnailUrl: "",
    order: 6,
  },
  {
    id: "cut-shot",
    name: "Cut Shot",
    category: "pace",
    description:
      "A back-foot shot played to a wide, short delivery, cut square or behind square on the off side with a horizontal bat.",
    techniqueNotes:
      "Free the arms by moving back and across, wait for the ball to arrive, and slash down on it with the bat coming across to keep it along the ground.",
    commonMistakes:
      "Cutting too close to the body, playing at deliveries that are not wide or short enough, and edging to the keeper or slips.",
    thumbnailUrl: "",
    order: 7,
  },
  {
    id: "square-cut",
    name: "Square Cut",
    category: "pace",
    description:
      "A powerful cut played squarer on the off side, sending a short and wide ball racing towards point or backward point.",
    techniqueNotes:
      "Transfer weight onto the back foot, give the arms room, and strike the ball at the top of the bounce with a strong downward swing.",
    commonMistakes:
      "Reaching for the ball, playing with bent arms, and rolling the wrists too early which lifts the ball to point.",
    thumbnailUrl: "",
    order: 8,
  },
  {
    id: "sweep-shot",
    name: "Sweep Shot",
    category: "spin",
    description:
      "A premeditated front-foot shot against spin, sweeping a good-length ball round to the leg side with a horizontal bat.",
    techniqueNotes:
      "Get the front knee down to the pitch of the ball, keep the head over the ball, and swing across to send it fine or square of the wicket.",
    commonMistakes:
      "Sweeping deliveries that are too full or too short, missing the line, and exposing the stumps or being trapped lbw.",
    thumbnailUrl: "",
    order: 9,
  },
  {
    id: "reverse-sweep",
    name: "Reverse Sweep",
    category: "spin",
    description:
      "An improvised sweep where the batter reverses the hands to hit a spinning ball towards the off side behind point.",
    techniqueNotes:
      "Switch the grip or rotate the wrists, get low, and guide or power the ball into the vacant off-side region behind square.",
    commonMistakes:
      "Committing too early, getting the hands tangled, and missing a straight ball to be bowled or trapped lbw.",
    thumbnailUrl: "",
    order: 10,
  },
  {
    id: "flick-shot",
    name: "Flick Shot",
    category: "attacking",
    description:
      "A wristy flick off the pads that redirects a straight or leg-side delivery through the mid-wicket and square-leg region.",
    techniqueNotes:
      "Get the front foot towards the ball, let it come to you, and use the wrists to whip it off the pads while keeping the head still.",
    commonMistakes:
      "Flicking across the line too early, closing the bat face, and producing a leading edge back to the bowler.",
    thumbnailUrl: "",
    order: 11,
  },
  {
    id: "glance",
    name: "Glance",
    category: "pace",
    description:
      "A delicate deflection of a ball on the pads or leg stump, glanced fine down to the leg side behind square.",
    techniqueNotes:
      "Play late with soft hands, angle the bat face towards fine leg, and use the pace of the ball rather than power.",
    commonMistakes:
      "Playing too hard at it, getting too far across and missing the line, or glancing straight to the leg-side fielder.",
    thumbnailUrl: "",
    order: 12,
  },
  {
    id: "defensive-block",
    name: "Defensive Block",
    category: "defensive",
    description:
      "A solid stop of a good delivery with soft hands and no intent to score — the foundation of building an innings.",
    techniqueNotes:
      "Get bat and pad close together, present a straight, angled face to deaden the ball, and keep the hands relaxed so it drops at the feet.",
    commonMistakes:
      "Hard hands pushing the ball to fielders, a gap between bat and pad, and committing to the wrong foot.",
    thumbnailUrl: "",
    order: 13,
  },
  {
    id: "forward-defensive",
    name: "Forward Defensive",
    category: "defensive",
    description:
      "A front-foot defensive shot to a good-length ball, smothering spin and pace by meeting the ball close to the pitch.",
    techniqueNotes:
      "Stride forward to the pitch of the ball, head over it, and present a vertical bat with bat-and-pad together to kill the bounce.",
    commonMistakes:
      "Not getting fully to the pitch, leaving a bat-pad gap, and pressing forward with hard hands that pop up catches.",
    thumbnailUrl: "",
    order: 14,
  },
  {
    id: "backward-defensive",
    name: "Backward Defensive",
    category: "defensive",
    description:
      "A back-foot defensive shot to a rising good-length ball, played down with a straight bat to negate extra bounce.",
    techniqueNotes:
      "Move back and across to cover the stumps, get up tall, and play the ball down underneath the eyes with soft hands.",
    commonMistakes:
      "Standing too upright without moving back, playing away from the body, and fending bounce to the slip cordon.",
    thumbnailUrl: "",
    order: 15,
  },
  {
    id: "lofted-drive",
    name: "Lofted Drive",
    category: "attacking",
    description:
      "An aerial drive that clears the infield, hitting a full delivery straight or over the off side for elevation and distance.",
    techniqueNotes:
      "Get to the pitch of the ball, lean into it, and hit through the line with a high follow-through, opening the bat face slightly for loft.",
    commonMistakes:
      "Not reaching the pitch, leaning back which slices the ball, and mistiming the loft to be caught in the deep.",
    thumbnailUrl: "",
    order: 16,
  },
];

export const SHOT_NAMES = SHOTS.map((s) => s.name);

export function shotByName(name: string): Shot | undefined {
  return SHOTS.find((s) => s.name === name);
}

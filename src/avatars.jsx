// Set di avatar illustrati (SVG) per gli operatori, usati nella prenotazione
// online al posto della foto. Il salone può sceglierne uno dalle Impostazioni
// o caricare una foto vera. Di default ne viene assegnato uno in modo
// deterministico (così resta stabile finché non lo si cambia).

const BG = ["#FBE5D6", "#E7F0E6", "#E5EEF7", "#F4EAD6", "#F7E3EC", "#E9E6F4", "#FBEFD6", "#DEEFEC", "#F0E6DA", "#E6ECF4"];
const SKIN = ["#F4CDA6", "#E9B488", "#CF9A70", "#A9714F"];
const HAIR = ["#2A2018", "#5A3A22", "#8A6A2E", "#B8893B", "#473526", "#1c1917"];
const CLOTH = ["#C9A26B", "#7E8A6B", "#6E84A3", "#B07D8E", "#8779A6", "#A6885A", "#5E8A82"];
const STYLES = ["short", "bun", "curly", "long"];

// [bg, skin, hair, style, cloth]
const PRESETS = [
  [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 5, 2, 2], [3, 0, 3, 3, 3],
  [4, 1, 4, 0, 4], [5, 3, 0, 1, 5], [6, 2, 2, 2, 6], [7, 0, 5, 3, 0],
  [8, 3, 1, 0, 1], [9, 1, 3, 2, 2], [0, 2, 4, 1, 3], [3, 0, 0, 3, 4],
];
export const AVATAR_IDS = PRESETS.map((_, i) => "av" + (i + 1));

function Hair({ style, color }) {
  if (style === "bun") return (<g fill={color}><path d="M27 42 C27 22 73 22 73 42 C66 31 58 28 50 28 C42 28 34 31 27 42 Z" /><circle cx="50" cy="19" r="7" /></g>);
  if (style === "curly") return (<g fill={color}><circle cx="33" cy="34" r="9" /><circle cx="44" cy="26" r="10" /><circle cx="56" cy="26" r="10" /><circle cx="67" cy="34" r="9" /></g>);
  if (style === "long") return (<g fill={color}><path d="M27 42 C27 22 73 22 73 42 C66 31 58 28 50 28 C42 28 34 31 27 42 Z" /><path d="M27 40 L29 66 Q33 56 34 48 Z" /><path d="M73 40 L71 66 Q67 56 66 48 Z" /></g>);
  return (<path d="M27 42 C27 22 73 22 73 42 C66 31 58 28 50 28 C42 28 34 31 27 42 Z" fill={color} />);
}

export function AvatarSvg({ id, size = 40, photo, ring = false, className = "", style = {} }) {
  const box = { width: size, height: size, borderRadius: "9999px", overflow: "hidden", flexShrink: 0, ...(ring ? { boxShadow: "0 0 0 2px rgba(255,255,255,0.9), 0 0 0 3px rgba(28,25,23,0.08)" } : {}), ...style };
  if (photo) return <div className={className} style={box}><img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
  const idx = Math.max(0, AVATAR_IDS.indexOf(id));
  const [bg, sk, hr, stl, cl] = PRESETS[idx] || PRESETS[0];
  return (
    <div className={className} style={box}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        <rect width="100" height="100" fill={BG[bg]} />
        <ellipse cx="50" cy="99" rx="31" ry="26" fill={CLOTH[cl]} />
        <circle cx="50" cy="45" r="22" fill={SKIN[sk]} />
        <Hair style={STYLES[stl]} color={HAIR[hr]} />
        <circle cx="42.5" cy="46" r="2.5" fill="#3f342c" />
        <circle cx="57.5" cy="46" r="2.5" fill="#3f342c" />
        <path d="M43 53 Q50 59 57 53" fill="none" stroke="#9b6f57" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Avatar di default deterministico (stabile) finché il salone non ne sceglie uno.
export function avatarIdFor(st) {
  if (st && st.avatar && AVATAR_IDS.includes(st.avatar)) return st.avatar;
  const s = String((st && (st.id || st.name)) || "");
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_IDS[h % AVATAR_IDS.length];
}

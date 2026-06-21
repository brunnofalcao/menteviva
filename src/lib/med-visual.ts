// ============================================================
// Identidade visual do medicamento (estilo Apple Health)
// Cor determinística pelo nome + formato visual + nome secundário.
// Sem depender de coluna nova no banco.
// ============================================================

// paleta calma, color-blind safe, sem vermelho agressivo
const MED_COLORS = [
  { bg: "#E3EEFB", ink: "#2C6BBF", dot: "#4A90D9" }, // azul
  { bg: "#E6F3EC", ink: "#2E8B62", dot: "#43A57C" }, // verde
  { bg: "#F1EAF8", ink: "#7A52A8", dot: "#9B6FC9" }, // lilás
  { bg: "#FBF0E3", ink: "#B5793A", dot: "#D49A55" }, // âmbar
  { bg: "#FDEBEF", ink: "#B5527A", dot: "#D77098" }, // rosa
  { bg: "#E5F1F2", ink: "#2C8088", dot: "#46A0A8" }, // teal
];

// formato → emoji/forma (pill shape recognition)
const FORM_SHAPE: Record<string, string> = {
  "Comprimido": "⬭",
  "Cápsula": "▭",
  "Gota": "💧",
  "Mililitro": "🥄",
};

export type MedVisual = {
  color: { bg: string; ink: string; dot: string };
  shape: string;
  shapeLabel: string;
  initial: string;
};

export function medVisual(name: string, form?: string | null): MedVisual {
  let hash = 0;
  for (let i = 0; i < (name ?? "").length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const color = MED_COLORS[hash % MED_COLORS.length];
  const shape = FORM_SHAPE[form ?? ""] ?? "⬭";
  const shapeLabel = form ?? "Comprimido";
  return { color, shape, shapeLabel, initial: (name?.[0] ?? "M").toUpperCase() };
}

// nome secundário legível: "Azul oval · Comprimido"
const COLOR_NAME = ["Azul", "Verde", "Lilás", "Âmbar", "Rosa", "Turquesa"];
export function medSubtitle(name: string, form?: string | null): string {
  let hash = 0;
  for (let i = 0; i < (name ?? "").length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const cor = COLOR_NAME[hash % COLOR_NAME.length];
  return form ? `${cor} · ${form}` : cor;
}

// ---------- Linguagem calma (Apple-like, sem pânico) ----------
export const CALM = {
  missedDose: "Esta dose ainda não foi registrada",
  missedHint: "Sem problema. Você pode registrar agora se já tomou.",
  takenConfirm: "Registrado",
  upcoming: "Em breve",
  now: "Agora",
  done: "Concluída",
  allDone: "Tudo certo por hoje",
  allDoneHint: "Você registrou todas as suas doses. 💚",
  noneToday: "Nenhuma dose programada para hoje",
  error: "Revise as informações antes de continuar",
};

// status visual instantâneo — nunca vermelho agressivo
export function doseTone(status: string, isPast: boolean) {
  if (status === "taken") return { color: "#43A57C", label: "Registrada", soft: "#E6F3EC" };
  if (status === "skipped") return { color: "#B5793A", label: "Pulada", soft: "#FBF0E3" };
  if (isPast) return { color: "#9AA0A6", label: "Pendente", soft: "#EEF0F2" }; // discreto, não vermelho
  return { color: "var(--accent)", label: "Em breve", soft: "var(--accent-soft)" };
}

import React, { useEffect, useState } from "react";
import avatar1 from "../../assets/avatars/avatar-1.png";
import avatar2 from "../../assets/avatars/avatar-2.png";
import avatar3 from "../../assets/avatars/avatar-3.png";

const AVATARS = {
  luna: {
    name: "Luna",
    role: "Teman belajar",
    bg: "#DFF4FF",
    accent: "#4F8EF7",
    hair: "#7A4E2D",
    shirt: "#4F8EF7",
    skin: "#F6C7A8",
    asset: avatar1,
  },
  bimo: {
    name: "Bimo",
    role: "Teman belajar",
    bg: "#FFF2C7",
    accent: "#F4B400",
    hair: "#2E2A26",
    shirt: "#F4B400",
    skin: "#B96F4A",
    asset: avatar2,
  },
  tara: {
    name: "Tara",
    role: "Teman belajar",
    bg: "#E5F8ED",
    accent: "#2E9B65",
    hair: "#1F5B4A",
    shirt: "#2E9B65",
    skin: "#E7B58D",
    asset: avatar3,
  },
};

function FaceAvatar({ id, size = "md", label, className = "", useAsset = true }) {
  const a = AVATARS[id] || AVATARS.luna;
  const remoteAsset = typeof id === "string" && /^(https:\/\/|blob:)/i.test(id);
  const assetSource = remoteAsset ? id : a.asset;
  const [assetFailed, setAssetFailed] = useState(false);

  useEffect(() => {
    setAssetFailed(false);
  }, [id]);
  const sizeClass =
    size === "xl"
      ? "w-28 h-28"
      : size === "lg"
        ? "w-20 h-20"
        : size === "sm"
          ? "w-9 h-9"
          : "w-12 h-12";

  return (
    <div
      className={`${sizeClass} relative rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 ${className}`}
      style={{ background: a.bg }}
      aria-label={label || "Avatar SignLearn"}
      role={label ? "img" : undefined}
    >
      {useAsset && !assetFailed ? (
        <img
          src={assetSource}
          alt={label || "Avatar SignLearn"}
          className="h-full w-full object-cover"
          onError={() => setAssetFailed(true)}
        />
      ) : (
        <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
          <circle cx="60" cy="60" r="60" fill={a.bg} />
          <path d="M28 111c4-26 17-39 32-39s28 13 32 39" fill={a.shirt} />
          <path d="M31 50c0-24 12-38 30-38 21 0 31 16 28 40-7-10-16-15-30-15-10 0-19 4-28 13Z" fill={a.hair} />
          <ellipse cx="60" cy="58" rx="25" ry="29" fill={a.skin} />
          <circle cx="50" cy="57" r="2.8" fill="#1F2937" />
          <circle cx="70" cy="57" r="2.8" fill="#1F2937" />
          <path d="M52 68c5 4 11 4 16 0" fill="none" stroke="#8B4B45" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M28 82c10-8 17-12 25-12" fill="none" stroke={a.shirt} strokeWidth="7" strokeLinecap="round" />
          <path d="M86 86c-7-12-13-17-19-20" fill="none" stroke={a.skin} strokeWidth="7" strokeLinecap="round" />
          <path d="M72 65l8-10m-3 13 9-7m-14 0 5-10" fill="none" stroke={a.skin} strokeWidth="5" strokeLinecap="round" />
          <circle cx="86" cy="44" r="7" fill={a.accent} opacity=".9" />
          <path d="M84 44h4m-2-2v4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {useAsset && assetFailed && (
        <span className="sr-only">Aset gambar belum tersedia, gunakan avatar bawaan.</span>
      )}
    </div>
  );
}

export function SignLearnAvatar({ id = "luna", size = "md", className = "", useAsset = true }) {
  return <FaceAvatar id={id} size={size} className={className} useAsset={useAsset} />;
}

export const SIGNLEARN_AVATARS = Object.entries(AVATARS).map(([id, data]) => ({
  id,
  ...data,
}));

export function resolveAvatarId(value) {
  if (typeof value === "string" && /^https:\/\//i.test(value)) return value;
  return AVATARS[value] ? value : "luna";
}

export default SignLearnAvatar;

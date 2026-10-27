import Image from "next/image";

interface PetImageProps {
  assetUrl?: string;
}

export function PetImage({ assetUrl }: PetImageProps) {
  if (!assetUrl) {
    return (
      <div
        style={{
          width: 120,
          height: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#eee",
          borderRadius: "50%",
        }}
      >
        <span style={{ color: "#888", fontSize: 12, textAlign: "center" }}>
          Sin imagen
        </span>
      </div>
    );
  }

  return (
    <Image src={assetUrl} alt="Mascota" width={120} height={120} priority />
  );
}

export function BackgroundBlobs() {
  return (
    <div className="bg-blobs" aria-hidden="true">
      <span
        style={{
          top: "-10%",
          left: "-8%",
          width: "42vw",
          height: "42vw",
          background: "var(--blob-1)",
        }}
      />
      <span
        style={{
          top: "8%",
          right: "-10%",
          width: "34vw",
          height: "34vw",
          background: "var(--blob-2)",
        }}
      />
      <span
        style={{
          bottom: "-15%",
          left: "20%",
          width: "38vw",
          height: "38vw",
          background: "var(--blob-3)",
        }}
      />
    </div>
  );
}

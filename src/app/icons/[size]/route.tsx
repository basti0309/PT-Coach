import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

export async function GET(_request: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size: raw } = await ctx.params;
  const size = SIZES.has(Number(raw)) ? Number(raw) : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f5bc4",
          color: "white",
          fontSize: size * 0.38,
          fontWeight: 800,
          letterSpacing: -2,
        }}
      >
        PT
      </div>
    ),
    { width: size, height: size },
  );
}

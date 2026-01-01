import {NextResponse} from "next/server";
import {getI18nRequestContext} from "@/i18n/request";

type LandingMessages = {
  landing?: {
    lead?: {
      title?: string;
    };
  };
};

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ok: false}, {status: 404});
  }

  const ctx = await getI18nRequestContext();
  const m = ctx.messages as unknown as LandingMessages;

  return NextResponse.json({
    locale: ctx.locale,
    timeZone: ctx.timeZone,
    hasLanding: Boolean(m.landing),
    sample: {
      landingLeadTitle: m.landing?.lead?.title ?? null
    }
  });
}

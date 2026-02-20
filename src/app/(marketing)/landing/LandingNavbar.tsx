import Link from "next/link";
import { Button } from "@/ui/components/Button";
import { getI18nRequestContext } from "@/i18n/request";

export default async function LandingNavbar() {
    const { messages } = await getI18nRequestContext();
    const tNav = ((messages as Record<string, unknown>)?.marketing as Record<string, Record<string, string>>)?.nav || {};

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0D1B2A]/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight text-white">Fin<span className="text-[#4CAF50]">Hub</span></span>
                    </Link>
                    <div className="hidden md:flex md:gap-6">
                        <Link href="#product" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">{tNav.product || "Product"}</Link>
                        <Link href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">{tNav.howItWorks || "How it works"}</Link>
                        <Link href="#pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">{tNav.pricing || "Pricing"}</Link>
                        <Link href="#faq" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">FAQ</Link>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/" className="hidden sm:block text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Language
                    </Link>
                    <Link href="/login">
                        <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/5">
                            {tNav.login || "Log in"}
                        </Button>
                    </Link>
                    <Link href="/">
                        <Button className="bg-[#4CAF50] text-[#0D1B2A] hover:bg-[#4CAF50]/90">
                            {tNav.getStarted || "Get Started"}
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}

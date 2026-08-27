import { AuthForm } from "@/components/AuthForm";
import { StorefrontFooter, StorefrontHeader } from "@/components/Storefront";
export default function RecoveryPage() { return <><StorefrontHeader /><main className="page container"><div className="auth"><AuthForm mode="recovery" /></div></main><StorefrontFooter /></>; }

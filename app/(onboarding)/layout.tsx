import { getCurrentUser } from "@/lib/current-organization";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await getCurrentUser();
  return children;
}

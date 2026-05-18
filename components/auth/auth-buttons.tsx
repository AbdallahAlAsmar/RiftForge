import Link from "next/link";
import { MessageCircle, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthButtons({
  size = "sm",
  className = ""
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button asChild size={size}>
        <Link href="/auth/riot">
          <Swords className="h-4 w-4" />
          Riot Games
        </Link>
      </Button>
      <Button asChild variant="outline" size={size}>
        <Link href="/auth/discord">
          <MessageCircle className="h-4 w-4" />
          Discord
        </Link>
      </Button>
    </div>
  );
}

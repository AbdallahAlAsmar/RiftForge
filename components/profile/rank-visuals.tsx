"use client";

import Image, { type StaticImageData } from "next/image";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { normalizeRank, rankLabel, type Rank } from "@/lib/domain/ranks";

import ironRankIcon from "@/components/Rank-icons/Rank=Iron.png";
import bronzeRankIcon from "@/components/Rank-icons/Rank=Bronze.png";
import silverRankIcon from "@/components/Rank-icons/Rank=Silver.png";
import goldRankIcon from "@/components/Rank-icons/Rank=Gold.png";
import platinumRankIcon from "@/components/Rank-icons/Rank=Platinum.png";
import emeraldRankIcon from "@/components/Rank-icons/Rank=Emerald.png";
import diamondRankIcon from "@/components/Rank-icons/Rank=Diamond.png";
import masterRankIcon from "@/components/Rank-icons/Rank=Master.png";
import grandmasterRankIcon from "@/components/Rank-icons/Rank=Grandmaster.png";
import challengerRankIcon from "@/components/Rank-icons/Rank=Challenger.png";
import ironWing from "@/components/Rank-icons/Wings/Iron.png";
import bronzeWing from "@/components/Rank-icons/Wings/Bronze.png";
import silverWing from "@/components/Rank-icons/Wings/Silver.png";
import goldWing from "@/components/Rank-icons/Wings/Gold.png";
import platinumWing from "@/components/Rank-icons/Wings/Platinum.png";
import emeraldWing from "@/components/Rank-icons/Wings/Emerald.png";
import diamondWing from "@/components/Rank-icons/Wings/Diamond.png";
import masterWing from "@/components/Rank-icons/Wings/Master.png";
import grandmasterWing from "@/components/Rank-icons/Wings/Grand.png";
import challengerWing from "@/components/Rank-icons/Wings/Challenger.png";

type RankVisualAssets = {
  icon: StaticImageData;
  wing: StaticImageData;
};

const rankVisuals: Record<Rank, RankVisualAssets> = {
  iron: { icon: ironRankIcon, wing: ironWing },
  bronze: { icon: bronzeRankIcon, wing: bronzeWing },
  silver: { icon: silverRankIcon, wing: silverWing },
  gold: { icon: goldRankIcon, wing: goldWing },
  platinum: { icon: platinumRankIcon, wing: platinumWing },
  emerald: { icon: emeraldRankIcon, wing: emeraldWing },
  diamond: { icon: diamondRankIcon, wing: diamondWing },
  master: { icon: masterRankIcon, wing: masterWing },
  grandmaster: { icon: grandmasterRankIcon, wing: grandmasterWing },
  challenger: { icon: challengerRankIcon, wing: challengerWing }
};

type RankAvatarProps = {
  rank?: string | null;
  src?: string | null;
  alt: string;
  showBorder?: boolean;
  className?: string;
  imageClassName?: string;
};

type RankLabelProps = {
  rank?: string | null;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

export function RankAvatar({
  rank,
  src,
  alt,
  showBorder = true,
  className,
  imageClassName
}: RankAvatarProps) {
  const rankKey = normalizeRank(rank);
  const assets = rankKey ? rankVisuals[rankKey] : null;
  const borderAsset = showBorder && assets ? assets.wing : null;

  return (
    <div
      className={cn(
        "relative inline-flex aspect-square shrink-0 items-center justify-center",
        className
      )}
    >
      {/* Wing: centered on the container, scale controls how much it bleeds out */}
      {borderAsset ? (
        <Image
          src={borderAsset}
          alt=""
          aria-hidden
          className="
            pointer-events-none
            absolute
            inset-0
            z-20
            h-full
            w-full
            object-contain
            scale-[1.18]
          "
        />
      ) : null}

      {/* Avatar circle: inset must match where the wing's inner opening sits */}
      <div
        className="
          absolute
          inset-[18%]
          z-10
          overflow-hidden
          rounded-full
          bg-secondary
          shadow-[0_0_0_2px_rgba(0,0,0,0.35)]
        "
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className={cn("h-full w-full object-cover", imageClassName)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserRound className="h-1/2 w-1/2 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

export function RankLabel({ rank, className, iconClassName, textClassName }: RankLabelProps) {
  const rankKey = normalizeRank(rank);
  const assets = rankKey ? rankVisuals[rankKey] : null;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {assets ? (
        <Image
          src={assets.icon}
          alt=""
          aria-hidden
          className={cn("h-4 w-4 shrink-0 object-contain", iconClassName)}
        />
      ) : null}
      <span className={textClassName}>{rankLabel(rank)}</span>
    </span>
  );
}
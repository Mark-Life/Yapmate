"use client";

import { cn } from "@yapmate/components/lib/utils";
import { Button as ShadcnButton } from "@yapmate/components/ui/button";
import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon } from "lucide-react";

export type ButtonProps = {
  label: string;
  variant?: "primary" | "secondary" | "outline" | null;
  onClick?: () => void;
};

export function Button({ label, variant, onClick }: ButtonProps) {
  return (
    <ShadcnButton
      variant={
        variant === "primary"
          ? "default"
          : variant === "outline"
            ? "outline"
            : "secondary"
      }
      onClick={onClick}
    >
      {label}
    </ShadcnButton>
  );
}

export type FlashCardProps = {
  front: string;
  back: string;
  hint?: string | null;
  category?: string | null;
};

export function FlashCard({ front, back, hint, category }: FlashCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={cn(
        "relative min-h-48 cursor-pointer rounded-lg border p-6 shadow-sm transition-all",
        "hover:shadow-md",
        isFlipped ? "bg-primary/5" : "bg-card"
      )}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      {category && (
        <span className="absolute top-2 right-2 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
          {category}
        </span>
      )}
      <div className="flex h-full flex-col items-center justify-center text-center">
        {!isFlipped ? (
          <>
            <p className="font-medium text-lg">{front}</p>
            {hint && (
              <p className="mt-2 text-muted-foreground text-sm">💡 {hint}</p>
            )}
            <p className="mt-4 text-muted-foreground text-xs">Click to flip</p>
          </>
        ) : (
          <>
            <p className="text-green-700 text-sm">Answer:</p>
            <p className="mt-2 font-medium text-lg">{back}</p>
            <p className="mt-4 text-muted-foreground text-xs">
              Click to see question
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export type FlashCardDeckCard = {
  front: string;
  back: string;
  hint?: string | null;
};

export type FlashCardDeckProps = {
  title: string;
  cards: FlashCardDeckCard[];
};

export function FlashCardDeck({ title, cards }: FlashCardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = cards[currentIndex];
  if (!currentCard) {
    return <p className="text-muted-foreground">No cards in deck</p>;
  }

  const goToNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-muted-foreground text-sm">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <div
        className={cn(
          "relative min-h-48 cursor-pointer rounded-lg border p-6 shadow-sm transition-all",
          "hover:shadow-md",
          isFlipped ? "bg-primary/5" : "bg-card"
        )}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="flex h-full flex-col items-center justify-center text-center">
          {!isFlipped ? (
            <>
              <p className="font-medium text-lg">{currentCard.front}</p>
              {currentCard.hint && (
                <p className="mt-2 text-muted-foreground text-sm">
                  💡 {currentCard.hint}
                </p>
              )}
              <p className="mt-4 text-muted-foreground text-xs">
                Click to flip
              </p>
            </>
          ) : (
            <>
              <p className="text-green-700 text-sm">Answer:</p>
              <p className="mt-2 font-medium text-lg">{currentCard.back}</p>
              <p className="mt-4 text-muted-foreground text-xs">
                Click to see question
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <ShadcnButton
          variant="outline"
          size="sm"
          onClick={goToPrev}
          disabled={currentIndex === 0}
        >
          <ChevronLeftIcon className="size-4" />
          Prev
        </ShadcnButton>
        <ShadcnButton
          variant="outline"
          size="sm"
          onClick={() => setIsFlipped(false)}
        >
          <RotateCcwIcon className="size-4" />
          Reset
        </ShadcnButton>
        <ShadcnButton
          variant="outline"
          size="sm"
          onClick={goToNext}
          disabled={currentIndex === cards.length - 1}
        >
          Next
          <ChevronRightIcon className="size-4" />
        </ShadcnButton>
      </div>
    </div>
  );
}

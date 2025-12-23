"use client";

import { usePromptInputController } from "@yapmate/components/ai-elements/prompt-input";
import { type ReactNode, type RefObject, useEffect } from "react";

export type DragDropZoneProps = {
  children: ReactNode;
  containerRef: RefObject<HTMLDivElement | null>;
  setIsDragging: (value: boolean) => void;
};

/**
 * Component that handles drag and drop functionality for file uploads.
 * Adds files to attachments when dropped on the container.
 */
export const DragDropZone = ({
  children,
  containerRef,
  setIsDragging,
}: DragDropZoneProps) => {
  const { attachments } = usePromptInputController();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
        setIsDragging(true);
      }
    };

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onDragLeave = (e: DragEvent) => {
      if (!container.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          attachments.add(e.dataTransfer.files);
        }
      }
    };

    container.addEventListener("dragenter", onDragEnter);
    container.addEventListener("dragover", onDragOver);
    container.addEventListener("dragleave", onDragLeave);
    container.addEventListener("drop", onDrop);

    return () => {
      container.removeEventListener("dragenter", onDragEnter);
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("dragleave", onDragLeave);
      container.removeEventListener("drop", onDrop);
    };
  }, [attachments, containerRef, setIsDragging]);

  return <>{children}</>;
};

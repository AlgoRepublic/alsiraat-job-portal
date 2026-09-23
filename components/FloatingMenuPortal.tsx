import React, {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const GAP_PX = 8;
const VIEWPORT_PADDING = 8;

export const FLOATING_MENU_Z_INDEX = 99999;

export type FloatingMenuRect = {
  top: number;
  left: number;
  width: number;
  maxHeight?: number;
};

type ComputeOptions = {
  minWidth: number;
  maxMenuHeight: number;
  menuWidth?: number;
  align?: "start" | "end";
};

export function computeFloatingMenuRect(
  anchorRect: DOMRect,
  menuHeight: number,
  options: ComputeOptions,
): FloatingMenuRect {
  const width = options.menuWidth ?? Math.max(anchorRect.width, options.minWidth);
  let left =
    options.align === "end" ? anchorRect.right - width : anchorRect.left;
  if (left + width > window.innerWidth - VIEWPORT_PADDING) {
    left = window.innerWidth - VIEWPORT_PADDING - width;
  }
  left = Math.max(VIEWPORT_PADDING, left);

  const spaceBelow =
    window.innerHeight - anchorRect.bottom - GAP_PX - VIEWPORT_PADDING;
  const spaceAbove = anchorRect.top - GAP_PX - VIEWPORT_PADDING;

  const preferBelow = spaceBelow >= menuHeight || spaceBelow >= spaceAbove;

  if (preferBelow) {
    return {
      top: anchorRect.bottom + GAP_PX,
      left,
      width,
      maxHeight: Math.min(options.maxMenuHeight, Math.max(spaceBelow, 120)),
    };
  }

  const height = Math.min(menuHeight, options.maxMenuHeight, spaceAbove);
  return {
    top: anchorRect.top - GAP_PX - height,
    left,
    width,
    maxHeight: height,
  };
}

export function useFloatingMenuClickOutside(
  isOpen: boolean,
  onClose: () => void,
  anchorRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef, menuRef]);
}

interface FloatingMenuPortalProps {
  isOpen: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  menuRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
  minWidth?: number;
  maxMenuHeight?: number;
  /** Fixed menu width in px; when omitted, uses at least `minWidth` and anchor width. */
  menuWidth?: number;
  align?: "start" | "end";
  /** Re-run position when these values change (e.g. filtered list length). */
  recalculateDeps?: readonly unknown[];
}

export function FloatingMenuPortal({
  isOpen,
  anchorRef,
  menuRef: externalMenuRef,
  className = "",
  children,
  minWidth = 200,
  maxMenuHeight = 240,
  menuWidth,
  align = "start",
  recalculateDeps = [],
}: FloatingMenuPortalProps) {
  const internalMenuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<FloatingMenuRect | null>(null);

  const setMenuRef = useCallback(
    (node: HTMLDivElement | null) => {
      internalMenuRef.current = node;
      if (externalMenuRef) {
        (
          externalMenuRef as React.MutableRefObject<HTMLDivElement | null>
        ).current = node;
      }
    },
    [externalMenuRef],
  );

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = internalMenuRef.current;
    if (!anchor || !menu) return;
    setRect(
      computeFloatingMenuRect(anchor.getBoundingClientRect(), menu.offsetHeight, {
        minWidth,
        maxMenuHeight,
        menuWidth,
        align,
      }),
    );
  }, [anchorRef, minWidth, maxMenuHeight, menuWidth, align]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setRect(null);
      return;
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalculateDeps is intentional
  }, [isOpen, updatePosition, ...recalculateDeps]);

  if (!isOpen) return null;

  const style: React.CSSProperties = rect
    ? {
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        maxHeight: rect.maxHeight,
        zIndex: FLOATING_MENU_Z_INDEX,
      }
    : {
        position: "fixed",
        top: 0,
        left: 0,
        visibility: "hidden",
        zIndex: FLOATING_MENU_Z_INDEX,
      };

  return createPortal(
    <div ref={setMenuRef} style={style} className={className}>
      {children}
    </div>,
    document.body,
  );
}

"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// スマホ: 下から全幅ボトムシート / デスクトップ(sm+): 中央モーダル
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // 共通
        "fixed z-50 bg-background border shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        // モバイル: ボトムシート
        "bottom-0 left-0 right-0 top-auto w-full max-w-none",
        "rounded-t-2xl border-b-0",
        "max-h-[92dvh] overflow-y-auto",
        "translate-x-0 translate-y-0",
        "duration-300",
        "data-[state=open]:slide-in-from-bottom-8",
        "data-[state=closed]:slide-out-to-bottom-full",
        // デスクトップ: 中央モーダル
        "sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:right-auto",
        "sm:translate-x-[-50%] sm:translate-y-[-50%]",
        "sm:max-w-lg sm:max-h-[88vh]",
        "sm:rounded-xl sm:border",
        "sm:duration-200",
        "sm:data-[state=open]:slide-in-from-bottom-0",
        "sm:data-[state=closed]:slide-out-to-bottom-0",
        "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
        "sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]",
        "sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]",
        // レイアウト: モバイル p-3 / デスクトップ p-5
        "grid gap-3 p-3 sm:gap-4 sm:p-5",
        className
      )}
      {...props}
    >
      {/* ボトムシートのドラッグハンドル（スマホのみ） */}
      <div className="absolute left-1/2 top-2 -translate-x-1/2 h-1 w-10 rounded-full bg-muted-foreground/20 sm:hidden" />

      {children}

      <DialogPrimitive.Close
        className={cn(
          "absolute right-4 top-4 rounded-sm opacity-60",
          "ring-offset-background transition-opacity hover:opacity-100",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:pointer-events-none",
          "data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
          // タッチターゲット確保
          "flex h-8 w-8 items-center justify-center"
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// 常に左揃え（スマホで text-center になる問題を解消）
const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

// 常に横並び（縦積みによる縦長を防止）
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-row justify-end gap-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base sm:text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
};

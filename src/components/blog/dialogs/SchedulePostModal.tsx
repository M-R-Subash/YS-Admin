"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Undo2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  addHours,
  startOfTomorrow,
  startOfToday,
  setHours,
  setMinutes,
  addDays,
} from "date-fns";
import { useNow } from "@/hooks/useNow";

export interface SchedulePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentScheduledAt?: string | Date | null;
  onConfirmSchedule: (date: Date) => Promise<boolean | void>;
  onCancelSchedule?: () => Promise<boolean | void>;
  isSubmitting?: boolean;
}

export function SchedulePostModal({
  open,
  onOpenChange,
  currentScheduledAt,
  onConfirmSchedule,
  onCancelSchedule,
  isSubmitting = false,
}: SchedulePostModalProps) {
  // Helper to compute default future date: Current date + 10 mins (rounded to next 5 minutes)
  const getDefaultFutureDate = (): Date => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10);
    const remainder = d.getMinutes() % 5;
    if (remainder !== 0) {
      d.setMinutes(d.getMinutes() + (5 - remainder));
    }
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  };

  // Initialize date & time (strictly future date, never past historical dates)
  const now = useNow();

  const getInitialDate = (): Date => {
    if (currentScheduledAt) {
      const d = new Date(currentScheduledAt);
      if (!isNaN(d.getTime()) && d.getTime() > now) {
        return d;
      }
    }
    return getDefaultFutureDate();
  };

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevScheduledAt, setPrevScheduledAt] = useState(currentScheduledAt);

  const [date, setDate] = useState<Date>(getInitialDate);
  const [hour, setHour] = useState<number>(() => {
    const initial = getInitialDate();
    const rawH = initial.getHours();
    const h = rawH % 12;
    return h === 0 ? 12 : h;
  });
  const [minute, setMinute] = useState<number>(() => {
    return getInitialDate().getMinutes();
  });
  const [period, setPeriod] = useState<"AM" | "PM">(() => {
    return getInitialDate().getHours() >= 12 ? "PM" : "AM";
  });

  // Sync state when modal opens or currentScheduledAt changes (render-phase state adjustment)
  if (open !== prevOpen || currentScheduledAt !== prevScheduledAt) {
    setPrevOpen(open);
    setPrevScheduledAt(currentScheduledAt);
    if (open) {
      const initial = getInitialDate();
      setDate(initial);
      const rawHour = initial.getHours();
      const h = rawHour % 12;
      setHour(h === 0 ? 12 : h);
      setMinute(initial.getMinutes());
      setPeriod(rawHour >= 12 ? "PM" : "AM");
    }
  }

  // Compute final composite Date object
  const finalScheduledDate = useMemo(() => {
    let resolvedHour = hour;
    if (period === "AM" && hour === 12) resolvedHour = 0;
    if (period === "PM" && hour !== 12) resolvedHour = hour + 12;

    const composite = new Date(date);
    composite.setHours(resolvedHour);
    composite.setMinutes(minute);
    composite.setSeconds(0);
    composite.setMilliseconds(0);
    return composite;
  }, [date, hour, minute, period]);

  const isInPast = finalScheduledDate.getTime() <= now;

  // Clean human-friendly schedule preview
  const previewText = useMemo(() => {
    if (isInPast) {
      return "Selected time is in the past. Please pick a future time.";
    }

    const timeStr = format(finalScheduledDate, "h:mm a");
    const relativeStr = formatDistanceToNow(finalScheduledDate, { addSuffix: true });

    if (isToday(finalScheduledDate)) {
      return `Today at ${timeStr} (${relativeStr})`;
    }
    if (isTomorrow(finalScheduledDate)) {
      return `Tomorrow at ${timeStr} (${relativeStr})`;
    }
    return `${format(finalScheduledDate, "MMM d, yyyy 'at' h:mm a")} (${relativeStr})`;
  }, [finalScheduledDate, isInPast]);

  // Presets
  const applyPreset = (presetDate: Date) => {
    const rounded = new Date(presetDate);
    const remainder = rounded.getMinutes() % 5;
    if (remainder !== 0) {
      rounded.setMinutes(rounded.getMinutes() + (5 - remainder));
    }
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);

    setDate(rounded);
    const rawH = rounded.getHours();
    const h = rawH % 12;
    setHour(h === 0 ? 12 : h);
    setMinute(rounded.getMinutes());
    setPeriod(rawH >= 12 ? "PM" : "AM");
  };

  const handleConfirm = async () => {
    if (isInPast) return;
    const ok = await onConfirmSchedule(finalScheduledDate);
    if (ok !== false) {
      onOpenChange(false);
    }
  };

  const isAlreadyScheduled = Boolean(
    currentScheduledAt &&
      !isNaN(new Date(currentScheduledAt).getTime()) &&
      new Date(currentScheduledAt).getTime() > now
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl p-6 md:p-8 rounded-xl shadow-2xl border border-border bg-card">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                {isAlreadyScheduled ? "Reschedule Blog Post" : "Schedule Blog Post"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pick a target release date and time for automated publishing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Presets Bar */}
        <div className="pt-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-semibold text-foreground">Quick Presets</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => applyPreset(addHours(new Date(), 3))}
              className="px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/80 text-xs font-medium transition-all text-center cursor-pointer hover:border-purple-500/40"
            >
              In 3 Hours
            </button>
            <button
              type="button"
              onClick={() => applyPreset(setMinutes(setHours(startOfTomorrow(), 9), 0))}
              className="px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/80 text-xs font-medium transition-all text-center cursor-pointer hover:border-purple-500/40"
            >
              Tomorrow 9:00 AM
            </button>
            <button
              type="button"
              onClick={() => applyPreset(setMinutes(setHours(startOfTomorrow(), 18), 0))}
              className="px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/80 text-xs font-medium transition-all text-center cursor-pointer hover:border-purple-500/40"
            >
              Tomorrow 6:00 PM
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset(setMinutes(setHours(addDays(startOfTomorrow(), 2), 10), 0))
              }
              className="px-3 py-2 rounded-md border border-border bg-card hover:bg-muted/80 text-xs font-medium transition-all text-center cursor-pointer hover:border-purple-500/40"
            >
              In 2 Days
            </button>
          </div>
        </div>

        {/* Date and Time Selector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Calendar Picker */}
          <div className="rounded-lg border border-border p-4 bg-muted/20 flex flex-col items-center justify-center">
            <div className="w-70 relative">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  if (newDate) setDate(newDate);
                }}
                disabled={(d) => d < startOfToday()}
                className="rounded-md border-0 p-0"
              />
            </div>
          </div>

          {/* Time Picker & Preview Panel */}
          <div className="flex flex-col justify-between gap-3.5 rounded-lg border border-border p-4 bg-muted/20">
            <div>
              {/* Digital Clock Display */}
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-background border border-border rounded-xl shadow-xs mb-3">
                <span className="font-mono text-3xl font-extrabold text-foreground tracking-tight">
                  {String(hour).padStart(2, "0")}
                </span>
                <span className="font-mono text-2xl font-bold text-purple-600 dark:text-purple-400 animate-pulse">
                  :
                </span>
                <span className="font-mono text-3xl font-extrabold text-foreground tracking-tight">
                  {String(minute).padStart(2, "0")}
                </span>
                <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md tracking-wider ml-1">
                  {period}
                </span>
              </div>

              {/* Shadcn Time Selectors */}
              <div className="flex items-center gap-2">
                {/* Hour */}
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                    Hour
                  </label>
                  <Select value={String(hour)} onValueChange={(val) => setHour(Number(val))}>
                    <SelectTrigger className="w-full h-10 px-3 bg-background border-border font-mono font-semibold text-xs cursor-pointer focus:ring-purple-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <SelectItem key={h} value={String(h)} className="font-mono text-xs cursor-pointer">
                          {String(h).padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <span className="text-lg font-bold text-muted-foreground pt-4">:</span>

                {/* Minute */}
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                    Minute
                  </label>
                  <Select value={String(minute)} onValueChange={(val) => setMinute(Number(val))}>
                    <SelectTrigger className="w-full h-10 px-3 bg-background border-border font-mono font-semibold text-xs cursor-pointer focus:ring-purple-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                        <SelectItem key={m} value={String(m)} className="font-mono text-xs cursor-pointer">
                          {String(m).padStart(2, "0")} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* AM / PM Toggle */}
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                    Period
                  </label>
                  <div className="grid grid-cols-2 h-10 rounded-lg border border-border bg-background p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setPeriod("AM")}
                      className={`text-xs font-bold rounded-md transition-all cursor-pointer ${
                        period === "AM"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriod("PM")}
                      className={`text-xs font-bold rounded-md transition-all cursor-pointer ${
                        period === "PM"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Popular Times */}
              <div className="pt-2.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1.5 block">
                  Popular Release Times
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "9:00 AM", h: 9, m: 0, p: "AM" as const },
                    { label: "12:00 PM", h: 12, m: 0, p: "PM" as const },
                    { label: "3:30 PM", h: 3, m: 30, p: "PM" as const },
                    { label: "6:00 PM", h: 6, m: 0, p: "PM" as const },
                    { label: "8:00 PM", h: 8, m: 0, p: "PM" as const },
                  ].map((slot) => {
                    const isActive = hour === slot.h && minute === slot.m && period === slot.p;
                    return (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => {
                          setHour(slot.h);
                          setMinute(slot.m);
                          setPeriod(slot.p);
                        }}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                          isActive
                            ? "border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-purple-500/30"
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Target Schedule Live Preview */}
            <div
              className={`p-3 rounded-lg border transition-colors ${
                isInPast
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  : "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
              }`}
            >
              <div className="flex items-start gap-2">
                {isInPast ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                )}
                <div>
                  <p className="text-xs font-bold">
                    {isInPast ? "Invalid Schedule Time" : "Scheduled For"}
                  </p>
                  <p className="text-xs mt-0.5 font-medium">{previewText}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
          <div>
            {isAlreadyScheduled && onCancelSchedule && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await onCancelSchedule();
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
                className="h-10 px-4 text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Cancel Schedule (Draft)</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={isSubmitting || isInPast}
              className="h-10 px-6 text-xs font-bold gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4" />
                  <span>{isAlreadyScheduled ? "Confirm Reschedule" : "Confirm Schedule"}</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

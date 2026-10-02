import {
  ExternalLink,
  CornerDownRight,
  ShieldCheck,
  Reply,
  Send,
  RotateCcw,
  CheckCircle,
  Circle,
  Trash2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CommentItem, ModalActionType, formatCompactTime } from "./types";

interface CommentCardProps {
  comment: CommentItem;
  replies: CommentItem[];
  selectedBlogId: string;
  filter: "all" | "pending" | "approved" | "trashed";
  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  openConfirmModal: (type: ModalActionType, comment: CommentItem) => void;
}

export function CommentCard({
  comment,
  replies,
  selectedBlogId,
  filter,
  replyingToId,
  setReplyingToId,
  replyText,
  setReplyText,
  openConfirmModal,
}: CommentCardProps) {
  return (
    <div
      className={`bg-card border rounded-sm p-3.5 sm:p-5 shadow-xs transition-all space-y-3 sm:space-y-4 relative ${
        comment.isTrashed
          ? "border-red-200 dark:border-red-900/40 bg-red-50/10 dark:bg-red-950/10"
          : !comment.isApproved
            ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10"
            : "hover:border-primary/30"
      }`}
    >
      {/* Header: Author Info + Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-extrabold uppercase shrink-0">
            {comment.name.charAt(0)}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <span className="text-sm font-bold text-foreground">
                {comment.name}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                &bull; {formatCompactTime(comment.createdAt)}
              </span>
            </div>

            <div className="text-xs text-muted-foreground font-medium truncate">
              &lt;{comment.email}&gt;
            </div>

            {/* Context Line: Shown ONLY when viewing all discussions */}
            {selectedBlogId === "all" && comment.blog && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                <span>Posted on:</span>
                <a
                  href={`/blogs/edit/${comment.blog.id}`}
                  className="font-bold text-foreground hover:underline flex items-center gap-1 truncate max-w-[200px]"
                  title="Edit blog post in admin"
                >
                  <span className="truncate">{comment.blog.title}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0 pt-0.5">
          {comment.isTrashed ? (
            <Badge className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800 text-[11px] font-bold px-2.5 py-0.5">
              Trashed
            </Badge>
          ) : comment.isApproved ? (
            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-bold px-2.5 py-0.5">
              Approved
            </Badge>
          ) : (
            <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[11px] font-bold px-2.5 py-0.5">
              Pending Approval
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Comment Body Content */}
      <div className="text-sm text-foreground/90 font-medium leading-relaxed whitespace-pre-wrap">
        {comment.content}
      </div>

      {/* NESTED CHILD REPLIES (Threaded UI) */}
      {replies.length > 0 && (
        <div className="pt-2 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <CornerDownRight className="w-3.5 h-3.5" />
            <span>Replies ({replies.length})</span>
          </div>

          <div className="space-y-3">
            {replies.map((reply) => {
              const isAdminReply = reply.name.includes("(Admin)");

              return (
                <div
                  key={reply.id}
                  className={`ml-2.5 sm:ml-8 p-3 sm:p-4 rounded-sm border-l-2 sm:border border-border/80 space-y-2 relative ${
                    isAdminReply
                      ? "bg-muted/40 border-l-4 border-l-black dark:border-l-white"
                      : "bg-background"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5 shrink-0">
                        {isAdminReply && (
                          <ShieldCheck className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />
                        )}
                        {reply.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                        &bull; {formatCompactTime(reply.createdAt)}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground font-medium truncate">
                      &lt;{reply.email}&gt;
                    </div>
                  </div>

                  <p className="text-xs text-foreground/90 font-medium leading-relaxed whitespace-pre-wrap">
                    {reply.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline Reply Form */}
      {replyingToId === comment.id && (
        <div className="p-4 rounded-sm border border-border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <Reply className="w-3.5 h-3.5" />
              <span>Reply to {comment.name} as Admin</span>
            </span>
            <button
              onClick={() => {
                setReplyingToId(null);
                setReplyText("");
              }}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Cancel
            </button>
          </div>

          <textarea
            rows={3}
            placeholder="Type your official response..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full p-3 bg-background border border-border rounded-sm text-xs font-medium focus:outline-none focus:border-accent transition-colors"
          />

          <div className="flex justify-end">
            <button
              onClick={() => openConfirmModal("reply", comment)}
              disabled={!replyText.trim()}
              className="px-4 py-2 bg-black hover:bg-black/90 text-white text-xs font-bold rounded-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Reply</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Action Buttons: Space-Between for Safety */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
        {/* Left Actions: Approve/Pending & Reply (or Restore) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {filter === "trashed" ? (
            /* Restore Button */
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => openConfirmModal("restore", comment)}
                    className="px-3 py-1.5 rounded-sm border border-border bg-background hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  />
                }
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Restore comment from trash
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              {/* Approve / Unapprove Button */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() =>
                        openConfirmModal(
                          comment.isApproved ? "unapprove" : "approve",
                          comment,
                        )
                      }
                      className={`px-3 py-1.5 rounded-sm text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        comment.isApproved
                          ? "bg-background border-border text-foreground hover:bg-muted"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                      }`}
                    />
                  }
                >
                  {comment.isApproved ? (
                    <>
                      <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Mark Pending</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </>
                  )}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {comment.isApproved
                    ? "Unapprove comment and hide from site"
                    : "Approve comment to publish on main site"}
                </TooltipContent>
              </Tooltip>

              {/* Reply Button */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => {
                        setReplyingToId(
                          replyingToId === comment.id ? null : comment.id,
                        );
                        setReplyText("");
                      }}
                      className="px-3 py-1.5 rounded-sm border border-border bg-background hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    />
                  }
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Post an official admin response
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Right Action: Delete Button (separated to avoid misclicks) */}
        <div>
          {filter === "trashed" ? (
            /* Delete Permanently Button */
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => openConfirmModal("delete", comment)}
                    className="px-3 py-1.5 rounded-sm border border-red-200 bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  />
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Permanently remove comment from database
              </TooltipContent>
            </Tooltip>
          ) : (
            /* Move to Trash Button */
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={() => openConfirmModal("trash", comment)}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-sm border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  />
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trash</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Move comment to trash
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

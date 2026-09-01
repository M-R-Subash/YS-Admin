"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { TrashActionType } from "@/components/ui/trash-confirmation-modal";

interface TrashModalState<T = any> {
  isOpen: boolean;
  type: TrashActionType | null;
  targetItem: T | null;
  targetId: string | null;
  targetName: string;
}

interface UseTrashManagerOptions<T = any> {
  itemType?: string;
  onSuccess?: () => void | Promise<void>;
  getApiEndpoint?: (id: string, actionType: TrashActionType) => string;
}

export function useTrashManager<T = any>(options: UseTrashManagerOptions<T> = {}) {
  const { itemType = "item", onSuccess, getApiEndpoint } = options;

  const [modal, setModal] = useState<TrashModalState<T>>({
    isOpen: false,
    type: null,
    targetItem: null,
    targetId: null,
    targetName: "",
  });

  const [loading, setLoading] = useState(false);

  const openTrashModal = (
    type: TrashActionType,
    item: T,
    id: string,
    name: string = "item"
  ) => {
    setModal({
      isOpen: true,
      type,
      targetItem: item,
      targetId: id,
      targetName: name,
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: null,
      targetItem: null,
      targetId: null,
      targetName: "",
    });
  };

  const handleConfirm = async (
    customAction?: (
      type: TrashActionType,
      item: T,
      id: string
    ) => Promise<void>
  ) => {
    if (!modal.type || !modal.targetId || !modal.targetItem) return;

    setLoading(true);

    try {
      if (customAction) {
        await customAction(modal.type, modal.targetItem, modal.targetId);
      } else if (getApiEndpoint) {
        const endpoint = getApiEndpoint(modal.targetId, modal.type);

        if (modal.type === "trash") {
          const res = await fetch(endpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isTrashed: true }),
          });
          if (!res.ok) throw new Error("Failed to move to trash");
          toast.add({ title: `${itemType} moved to trash`, type: "success" });
        } else if (modal.type === "restore") {
          const res = await fetch(endpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isTrashed: false }),
          });
          if (!res.ok) throw new Error("Failed to restore item");
          toast.add({ title: `${itemType} restored`, type: "success" });
        } else if (modal.type === "delete") {
          const res = await fetch(endpoint, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed to delete item");
          toast.add({ title: `${itemType} permanently deleted`, type: "success" });
        }
      }

      closeModal();
      if (onSuccess) await onSuccess();
    } catch (err) {
      console.error(`Trash action (${modal.type}) failed:`, err);
      toast.add({ title: "Action failed. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return {
    modal,
    loading,
    openTrashModal,
    closeModal,
    handleConfirm,
  };
}

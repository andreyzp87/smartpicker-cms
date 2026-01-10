import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function useDeleteConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteAction, setDeleteAction] = useState<(() => void) | null>(null);

  const confirm = (action: () => void) => {
    setDeleteAction(() => action);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    if (deleteAction) {
      deleteAction();
    }
    setIsOpen(false);
    setDeleteAction(null);
  };

  const Dialog = () => (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the item.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-red-600">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, Dialog };
}

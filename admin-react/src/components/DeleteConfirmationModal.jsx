import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';

function DeleteConfirmationModal({ 
  open, 
  onOpenChange, 
  title = 'Delete Item',
  itemName = '',
  message = 'Are you sure you want to delete this item?',
  description = 'This action cannot be undone.',
  onConfirm,
  isLoading = false
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-600">
            {itemName ? (
              <>
                {message} <span className="font-semibold">{itemName}</span>?
              </>
            ) : (
              message
            )}
          </p>
          <p className="text-sm text-gray-500 mt-2">{description}</p>
        </div>

        <DialogFooter>
          <div className="flex w-full justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteConfirmationModal;

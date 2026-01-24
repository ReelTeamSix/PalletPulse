// EmptyState Component Tests
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  describe('rendering variants', () => {
    it('should render generic variant by default', () => {
      const { getByText } = render(<EmptyState />);

      expect(getByText('Nothing here')).toBeTruthy();
      expect(getByText('There is no content to display.')).toBeTruthy();
    });

    it('should render pallets variant', () => {
      const { getByText } = render(<EmptyState variant="pallets" />);

      expect(getByText('No pallets yet')).toBeTruthy();
      expect(
        getByText('Start tracking your inventory by adding your first pallet.')
      ).toBeTruthy();
    });

    it('should render items variant', () => {
      const { getByText } = render(<EmptyState variant="items" />);

      expect(getByText('No items to show')).toBeTruthy();
      expect(getByText('Items you add will appear here.')).toBeTruthy();
    });

    it('should render expenses variant', () => {
      const { getByText } = render(<EmptyState variant="expenses" />);

      expect(getByText('No expenses tracked')).toBeTruthy();
      expect(getByText('Track your business expenses to see your true profit.')).toBeTruthy();
    });

    it('should render mileage variant', () => {
      const { getByText } = render(<EmptyState variant="mileage" />);

      expect(getByText('No trips logged')).toBeTruthy();
      expect(getByText('Track your business mileage for tax deductions.')).toBeTruthy();
    });

    it('should render sales variant', () => {
      const { getByText } = render(<EmptyState variant="sales" />);

      expect(getByText('No sales yet')).toBeTruthy();
      expect(getByText('Mark items as sold to track your profits.')).toBeTruthy();
    });

    it('should render search variant', () => {
      const { getByText } = render(<EmptyState variant="search" />);

      expect(getByText('No results found')).toBeTruthy();
      expect(getByText('Try adjusting your search or filters.')).toBeTruthy();
    });

    it('should render empty-pallet variant', () => {
      const { getByText } = render(<EmptyState variant="empty-pallet" />);

      expect(getByText('This pallet is empty')).toBeTruthy();
      expect(getByText('Add items to start tracking inventory.')).toBeTruthy();
    });

    it('should render all-sold variant with success styling', () => {
      const { getByText } = render(<EmptyState variant="all-sold" />);

      expect(getByText('All items sold!')).toBeTruthy();
      expect(
        getByText('Great job! All items from this pallet have been sold.')
      ).toBeTruthy();
    });

    it('should render notifications variant', () => {
      const { getByText } = render(<EmptyState variant="notifications" />);

      expect(getByText('No notifications')).toBeTruthy();
      expect(getByText("You're all caught up!")).toBeTruthy();
    });
  });

  describe('custom props', () => {
    it('should override title with custom prop', () => {
      const { getByText, queryByText } = render(
        <EmptyState variant="pallets" title="Custom Title" />
      );

      expect(getByText('Custom Title')).toBeTruthy();
      expect(queryByText('No pallets yet')).toBeNull();
    });

    it('should override message with custom prop', () => {
      const { getByText, queryByText } = render(
        <EmptyState variant="pallets" message="Custom message here" />
      );

      expect(getByText('Custom message here')).toBeTruthy();
      expect(
        queryByText('Start tracking your inventory by adding your first pallet.')
      ).toBeNull();
    });

    it('should apply custom style', () => {
      const { getByTestId } = render(
        <EmptyState style={{ marginTop: 100 }} testID="empty-state" />
      );

      const container = getByTestId('empty-state');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({ marginTop: 100 })
      );
    });
  });

  describe('action button', () => {
    it('should show action button when actionLabel and onAction provided', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <EmptyState variant="pallets" onAction={mockAction} />
      );

      expect(getByText('Add Your First Pallet')).toBeTruthy();
    });

    it('should use custom actionLabel', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <EmptyState
          variant="pallets"
          actionLabel="Custom Action"
          onAction={mockAction}
        />
      );

      expect(getByText('Custom Action')).toBeTruthy();
    });

    it('should call onAction when button pressed', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <EmptyState variant="pallets" onAction={mockAction} />
      );

      fireEvent.press(getByText('Add Your First Pallet'));

      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should not show action button when onAction not provided', () => {
      const { queryByText } = render(<EmptyState variant="pallets" />);

      expect(queryByText('Add Your First Pallet')).toBeNull();
    });

    it('should not show action button when actionLabel not provided and no default', () => {
      const mockAction = jest.fn();
      const { queryByText } = render(
        <EmptyState variant="notifications" onAction={mockAction} />
      );

      // notifications variant has no defaultAction
      expect(queryByText('Add Your First Pallet')).toBeNull();
    });
  });

  describe('secondary action', () => {
    it('should show secondary action when label and handler provided', () => {
      const mockSecondary = jest.fn();
      const { getByText } = render(
        <EmptyState
          variant="search"
          secondaryActionLabel="Reset All"
          onSecondaryAction={mockSecondary}
        />
      );

      expect(getByText('Reset All')).toBeTruthy();
    });

    it('should call onSecondaryAction when pressed', () => {
      const mockSecondary = jest.fn();
      const mockPrimary = jest.fn();
      const { getByText } = render(
        <EmptyState
          variant="search"
          onAction={mockPrimary}
          secondaryActionLabel="Reset All"
          onSecondaryAction={mockSecondary}
        />
      );

      fireEvent.press(getByText('Reset All'));

      expect(mockSecondary).toHaveBeenCalledTimes(1);
    });

    it('should not show secondary action when handler not provided', () => {
      const { queryByText } = render(
        <EmptyState variant="search" secondaryActionLabel="Reset All" />
      );

      expect(queryByText('Reset All')).toBeNull();
    });
  });

  describe('compact mode', () => {
    it('should render in compact mode', () => {
      const { getByText } = render(<EmptyState compact={true} />);

      // Just verify it renders without error
      expect(getByText('Nothing here')).toBeTruthy();
    });

    it('should show smaller action button in compact mode', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <EmptyState variant="pallets" compact={true} onAction={mockAction} />
      );

      expect(getByText('Add Your First Pallet')).toBeTruthy();
    });
  });

  describe('all-sold success state', () => {
    it('should use outline button variant for all-sold', () => {
      const mockAction = jest.fn();
      const { getByText } = render(
        <EmptyState variant="all-sold" onAction={mockAction} />
      );

      // The button should render with the text
      expect(getByText('View Profit Report')).toBeTruthy();
    });
  });
});

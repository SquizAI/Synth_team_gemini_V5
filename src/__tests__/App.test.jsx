import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

describe('App Component', () => {
  beforeEach(() => {
    render(<App />);
  });

  it('renders upload area', () => {
    expect(screen.getByRole('presentation', { name: /video upload area/i })).toBeInTheDocument();
  });

  it('shows upload message initially', () => {
    expect(screen.getByText(/drag and drop a video file here/i)).toBeInTheDocument();
  });

  it('displays supported formats', () => {
    expect(screen.getByText(/supported formats/i)).toBeInTheDocument();
    expect(screen.getByText(/mp4, webm, mov, quicktime/i)).toBeInTheDocument();
  });

  it('shows file size limit', () => {
    expect(screen.getByText(/maximum file size: 10gb/i)).toBeInTheDocument();
  });

  it('handles file drop', async () => {
    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    const dropArea = screen.getByRole('presentation', { name: /video upload area/i });

    fireEvent.drop(dropArea, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
  });
});

describe('Video Analysis Modes', () => {
  beforeEach(() => {
    render(<App />);
  });

  it('shows analysis modes when video is loaded', async () => {
    // Mock video loaded state
    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    const dropArea = screen.getByRole('presentation', { name: /video upload area/i });

    fireEvent.drop(dropArea, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/explore this video via/i)).toBeInTheDocument();
    });
  });

  it('allows custom prompt input', async () => {
    // Mock video loaded state and click custom mode
    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    const dropArea = screen.getByRole('presentation', { name: /video upload area/i });

    fireEvent.drop(dropArea, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      const customButton = screen.getByText(/custom/i);
      fireEvent.click(customButton);
      expect(screen.getByPlaceholderText(/type a custom prompt/i)).toBeInTheDocument();
    });
  });
});
import { fitWithin, formatBytes } from './image-compress';

describe('image-compress', () => {
  it('shrinks a large photo to 1600 px on the long side, keeping proportions', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 }); // landscape
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 }); // portrait
  });

  it('never enlarges a small image', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('shows sizes the way a person reads them', () => {
    expect(formatBytes(845 * 1024)).toBe('845 KB');
    expect(formatBytes(2.3 * 1024 * 1024)).toBe('2.3 MB');
  });
});

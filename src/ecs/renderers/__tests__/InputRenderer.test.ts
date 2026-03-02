import type {ThreeEvent} from '@react-three/fiber';
import type {Entity} from '../../types';
import {buildInputHandlers} from '../InputRenderer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal mock of ThreeEvent with stopPropagation and nativeEvent. */
function mockClickEvent(): ThreeEvent<MouseEvent> {
  return {stopPropagation: jest.fn()} as unknown as ThreeEvent<MouseEvent>;
}

function mockPointerEvent(movementX = 0, movementY = 0): ThreeEvent<PointerEvent> {
  return {
    stopPropagation: jest.fn(),
    nativeEvent: {movementX, movementY},
  } as unknown as ThreeEvent<PointerEvent>;
}

// ---------------------------------------------------------------------------
// Dial
// ---------------------------------------------------------------------------

describe('buildInputHandlers — dial', () => {
  function makeDial(): Entity {
    return {
      name: 'test-dial',
      dial: {
        segments: ['off', 'low', 'high'],
        currentIndex: 0,
        wraps: false,
        pendingTap: false,
        enabled: true,
      },
    };
  }

  test('onClick sets pendingTap = true', () => {
    const entity = makeDial();
    const {onClick} = buildInputHandlers(entity);
    expect(onClick).toBeDefined();

    onClick!(mockClickEvent());
    expect(entity.dial!.pendingTap).toBe(true);
  });

  test('onClick calls stopPropagation', () => {
    const entity = makeDial();
    const {onClick} = buildInputHandlers(entity);
    const ev = mockClickEvent();
    onClick!(ev);
    expect(ev.stopPropagation).toHaveBeenCalled();
  });

  test('onClick does not set pendingTap when disabled', () => {
    const entity = makeDial();
    entity.dial!.enabled = false;
    const {onClick} = buildInputHandlers(entity);
    onClick!(mockClickEvent());
    expect(entity.dial!.pendingTap).toBe(false);
  });

  test('no drag handlers for dial-only entity', () => {
    const entity = makeDial();
    const {onPointerDown, onPointerMove, onPointerUp} = buildInputHandlers(entity);
    expect(onPointerDown).toBeUndefined();
    expect(onPointerMove).toBeUndefined();
    expect(onPointerUp).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

describe('buildInputHandlers — toggle', () => {
  function makeToggle(): Entity {
    return {
      name: 'test-toggle',
      toggle: {isOn: false, pendingTap: false, enabled: true},
    };
  }

  test('onClick sets pendingTap = true', () => {
    const entity = makeToggle();
    const {onClick} = buildInputHandlers(entity);
    onClick!(mockClickEvent());
    expect(entity.toggle!.pendingTap).toBe(true);
  });

  test('onClick does not set pendingTap when disabled', () => {
    const entity = makeToggle();
    entity.toggle!.enabled = false;
    const {onClick} = buildInputHandlers(entity);
    onClick!(mockClickEvent());
    expect(entity.toggle!.pendingTap).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

describe('buildInputHandlers — button', () => {
  function makeButton(): Entity {
    return {
      name: 'test-button',
      button: {fired: false, pendingTap: false, enabled: true},
    };
  }

  test('onClick sets pendingTap = true', () => {
    const entity = makeButton();
    const {onClick} = buildInputHandlers(entity);
    onClick!(mockClickEvent());
    expect(entity.button!.pendingTap).toBe(true);
  });

  test('onClick does not set pendingTap when disabled', () => {
    const entity = makeButton();
    entity.button!.enabled = false;
    const {onClick} = buildInputHandlers(entity);
    onClick!(mockClickEvent());
    expect(entity.button!.pendingTap).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Crank
// ---------------------------------------------------------------------------

describe('buildInputHandlers — crank', () => {
  function makeCrank(): Entity {
    return {
      name: 'test-crank',
      crank: {
        angle: 0,
        angularVelocity: 0,
        sensitivity: 1,
        damping: 0.95,
        dragDelta: 0,
        isDragging: false,
        enabled: true,
      },
    };
  }

  test('onPointerDown sets isDragging and resets dragDelta', () => {
    const entity = makeCrank();
    const {onPointerDown} = buildInputHandlers(entity);
    expect(onPointerDown).toBeDefined();

    onPointerDown!(mockPointerEvent());
    expect(entity.crank!.isDragging).toBe(true);
    expect(entity.crank!.dragDelta).toBe(0);
  });

  test('onPointerMove sets dragDelta from movementY', () => {
    const entity = makeCrank();
    entity.crank!.isDragging = true;
    const {onPointerMove} = buildInputHandlers(entity);

    onPointerMove!(mockPointerEvent(10, -5));
    expect(entity.crank!.dragDelta).toBe(-5);
  });

  test('onPointerMove is ignored when not dragging', () => {
    const entity = makeCrank();
    const {onPointerMove} = buildInputHandlers(entity);

    const ev = mockPointerEvent(10, -5);
    onPointerMove!(ev);
    expect(entity.crank!.dragDelta).toBe(0);
    expect(ev.stopPropagation).not.toHaveBeenCalled();
  });

  test('onPointerUp clears isDragging', () => {
    const entity = makeCrank();
    entity.crank!.isDragging = true;
    const {onPointerUp} = buildInputHandlers(entity);

    onPointerUp!(mockPointerEvent());
    expect(entity.crank!.isDragging).toBe(false);
  });

  test('onPointerDown does not activate when disabled', () => {
    const entity = makeCrank();
    entity.crank!.enabled = false;
    const {onPointerDown} = buildInputHandlers(entity);

    onPointerDown!(mockPointerEvent());
    expect(entity.crank!.isDragging).toBe(false);
  });

  test('no onClick handler for crank-only entity', () => {
    const entity = makeCrank();
    const {onClick} = buildInputHandlers(entity);
    expect(onClick).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Plunger
// ---------------------------------------------------------------------------

describe('buildInputHandlers — plunger', () => {
  function makePlunger(axis: 'x' | 'y' | 'z' = 'y'): Entity {
    return {
      name: 'test-plunger',
      plunger: {
        displacement: 0,
        axis,
        minWorld: 0,
        maxWorld: 1,
        sensitivity: 1,
        dragDelta: 0,
        isDragging: false,
        springBack: false,
        enabled: true,
      },
    };
  }

  test('onPointerDown sets isDragging and resets dragDelta', () => {
    const entity = makePlunger();
    const {onPointerDown} = buildInputHandlers(entity);

    onPointerDown!(mockPointerEvent());
    expect(entity.plunger!.isDragging).toBe(true);
    expect(entity.plunger!.dragDelta).toBe(0);
  });

  test('onPointerMove uses movementY for y-axis plunger', () => {
    const entity = makePlunger('y');
    entity.plunger!.isDragging = true;
    const {onPointerMove} = buildInputHandlers(entity);

    onPointerMove!(mockPointerEvent(10, -7));
    expect(entity.plunger!.dragDelta).toBe(-7);
  });

  test('onPointerMove uses movementX for x-axis plunger', () => {
    const entity = makePlunger('x');
    entity.plunger!.isDragging = true;
    const {onPointerMove} = buildInputHandlers(entity);

    onPointerMove!(mockPointerEvent(12, -3));
    expect(entity.plunger!.dragDelta).toBe(12);
  });

  test('onPointerMove uses movementY for z-axis plunger', () => {
    const entity = makePlunger('z');
    entity.plunger!.isDragging = true;
    const {onPointerMove} = buildInputHandlers(entity);

    onPointerMove!(mockPointerEvent(4, 8));
    expect(entity.plunger!.dragDelta).toBe(8);
  });

  test('onPointerUp clears isDragging', () => {
    const entity = makePlunger();
    entity.plunger!.isDragging = true;
    const {onPointerUp} = buildInputHandlers(entity);

    onPointerUp!(mockPointerEvent());
    expect(entity.plunger!.isDragging).toBe(false);
  });

  test('onPointerDown does not activate when disabled', () => {
    const entity = makePlunger();
    entity.plunger!.enabled = false;
    const {onPointerDown} = buildInputHandlers(entity);

    onPointerDown!(mockPointerEvent());
    expect(entity.plunger!.isDragging).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// No input components
// ---------------------------------------------------------------------------

describe('buildInputHandlers — no input components', () => {
  test('returns all undefined handlers for plain entity', () => {
    const entity: Entity = {name: 'inert-box'};
    const handlers = buildInputHandlers(entity);
    expect(handlers.onClick).toBeUndefined();
    expect(handlers.onPointerDown).toBeUndefined();
    expect(handlers.onPointerMove).toBeUndefined();
    expect(handlers.onPointerUp).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Combined input components (edge case)
// ---------------------------------------------------------------------------

describe('buildInputHandlers — combined dial + crank', () => {
  test('entity with both dial and crank has onClick and drag handlers', () => {
    const entity: Entity = {
      name: 'combo',
      dial: {
        segments: ['a', 'b'],
        currentIndex: 0,
        wraps: true,
        pendingTap: false,
        enabled: true,
      },
      crank: {
        angle: 0,
        angularVelocity: 0,
        sensitivity: 1,
        damping: 0.95,
        dragDelta: 0,
        isDragging: false,
        enabled: true,
      },
    };

    const handlers = buildInputHandlers(entity);
    expect(handlers.onClick).toBeDefined();
    expect(handlers.onPointerDown).toBeDefined();
    expect(handlers.onPointerMove).toBeDefined();
    expect(handlers.onPointerUp).toBeDefined();

    // onClick sets dial pendingTap
    handlers.onClick!(mockClickEvent());
    expect(entity.dial!.pendingTap).toBe(true);

    // onPointerDown sets crank isDragging
    handlers.onPointerDown!(mockPointerEvent());
    expect(entity.crank!.isDragging).toBe(true);
  });
});

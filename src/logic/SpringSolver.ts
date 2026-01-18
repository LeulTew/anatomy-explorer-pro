/**
 * Simple 1D Spring Solver for procedural secondary motion.
 * Uses a semi-implicit Euler integration for stability.
 */
export class SpringSolver {
    public value: number;
    public velocity: number;
    public target: number;

    // Physics parameters
    public stiffness: number;
    public damping: number;
    public mass: number;

    constructor(initialValue: number, stiffness = 120, damping = 10, mass = 1) {
        this.value = initialValue;
        this.velocity = 0;
        this.target = initialValue;
        this.stiffness = stiffness;
        this.damping = damping;
        this.mass = mass;
    }

    /**
     * Resets the simulation to a specific value
     */
    reset(value: number) {
        this.value = value;
        this.velocity = 0;
        this.target = value;
    }

    /**
     * Updates the physics simulation
     * @param deltaTime Time in seconds since last frame
     */
    update(deltaTime: number): number {
        // Prevent explosion with large time steps (e.g. tab switching)
        const safeDt = Math.min(deltaTime, 0.05);

        // F = -k * (x - x_target) - d * v
        const displacement = this.value - this.target;
        const springForce = -this.stiffness * displacement;
        const dampingForce = -this.damping * this.velocity;

        const force = springForce + dampingForce;
        const acceleration = force / this.mass;

        this.velocity += acceleration * safeDt;
        this.value += this.velocity * safeDt;

        return this.value;
    }
}

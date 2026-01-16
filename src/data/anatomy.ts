export type MuscleGroup = 'Pectorals' | 'Abs' | 'Deltoids' | 'Biceps' | 'Trapezius';

export interface AnatomyInfo {
    id: MuscleGroup;
    name: string;
    description: string;
    action: string;
    exercises: string[];
}

export const ANATOMY_DATA: Record<MuscleGroup, AnatomyInfo> = {
    Pectorals: {
        id: 'Pectorals',
        name: 'Pectoralis Major',
        description: 'Large muscle in the upper chest, fanning across the chest from the shoulder to the breastbone.',
        action: 'Adducts and medially rotates the humerus.',
        exercises: ['Push-ups', 'Bench Press', 'Flyes']
    },
    Abs: {
        id: 'Abs',
        name: 'Rectus Abdominis',
        description: 'Paired muscle running vertically on each side of the anterior wall of the human abdomen.',
        action: 'Flexes the lumbar spine.',
        exercises: ['Crunches', 'Planks', 'Leg Raises']
    },
    Deltoids: {
        id: 'Deltoids',
        name: 'Deltoid',
        description: 'Rounded, triangular muscle located on the uppermost part of the arm and the top of the shoulder.',
        action: 'Abducts the arm at the shoulder.',
        exercises: ['Overhead Press', 'Lateral Raises']
    },
    Biceps: {
        id: 'Biceps',
        name: 'Biceps Brachii',
        description: 'Two-headed muscle on the upper arm between the shoulder and the elbow.',
        action: 'Flexes the elbow and supinates the forearm.',
        exercises: ['Curls', 'Chin-ups']
    },
    Trapezius: {
        id: 'Trapezius',
        name: 'Trapezius',
        description: 'Large superficial muscle that extends longitudinally from the occipital bone to the lower thoracic vertebrae.',
        action: 'Moves the scapula and supports the arm.',
        exercises: ['Shrugs', 'Face Pulls']
    }
};

export const MOVEMENT_TYPES = ['Breathing', 'Flex', 'Relax', 'Twist'] as const;
export type MovementType = typeof MOVEMENT_TYPES[number];

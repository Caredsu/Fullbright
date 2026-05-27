/**
 * Set Configuration Constants
 * Defines metadata for evaluation sets with labels, descriptions, and categories
 */

export const SET_METADATA = {
  1: {
    number: 1,
    label: 'LESSON AND DELIVERY',
    description: 'Evaluates the teacher\'s ability to plan, organize, and deliver lessons effectively to students.',
    category: 'Rating',
  },
  2: {
    number: 2,
    label: 'KNOWLEDGE OF SUBJECT MATTER',
    description: 'Assesses the teacher\'s depth of knowledge and mastery of their subject area.',
    category: 'Rating',
  },
  3: {
    number: 3,
    label: 'MANAGEMENT OF LEARNING',
    description: 'Measures how well the teacher manages the classroom and facilitates student learning.',
    category: 'Rating',
  },
  4: {
    number: 4,
    label: 'DEDICATION',
    description: 'Evaluates the teacher\'s commitment, professionalism, and dedication to their role.',
    category: 'Rating',
  },
};

/**
 * Get all set numbers in order
 */
export const getSetNumbers = () => Object.keys(SET_METADATA).map(Number);

/**
 * Get set metadata by number
 */
export const getSetMetadata = (setNumber: number) => SET_METADATA[setNumber];

/**
 * Get set label by number
 */
export const getSetLabel = (setNumber: number) => SET_METADATA[setNumber]?.label || `Set ${setNumber}`;

/**
 * Get set description by number
 */
export const getSetDescription = (setNumber: number) => SET_METADATA[setNumber]?.description || '';

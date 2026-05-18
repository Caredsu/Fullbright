<?php
require_once 'config/database.php';

// Sample test teachers data
$teachers = [
    [
        'name' => 'Dr. Maria Santos',
        'email' => 'maria.santos@fbc.edu',
        'department' => 'ECT',
        'specialization' => 'Education & Curriculum Technology',
        'status' => 'active',
    ],
    [
        'name' => 'Prof. Juan Dela Cruz',
        'email' => 'juan.delacruz@fbc.edu',
        'department' => 'EDUC',
        'specialization' => 'Educational Management',
        'status' => 'active',
    ],
    [
        'name' => 'Dr. Rosa Garcia',
        'email' => 'rosa.garcia@fbc.edu',
        'department' => 'CCJE',
        'specialization' => 'Criminal Justice Education',
        'status' => 'active',
    ],
    [
        'name' => 'Prof. Anthony Reyes',
        'email' => 'anthony.reyes@fbc.edu',
        'department' => 'BHT',
        'specialization' => 'Behavioral Health & Tourism',
        'status' => 'active',
    ],
    [
        'name' => 'Dr. Francesca Aquino',
        'email' => 'francesca.aquino@fbc.edu',
        'department' => 'ECT',
        'specialization' => 'Information Technology',
        'status' => 'active',
    ],
    [
        'name' => 'Prof. Ricardo Morales',
        'email' => 'ricardo.morales@fbc.edu',
        'department' => 'EDUC',
        'specialization' => 'Special Education',
        'status' => 'active',
    ],
    [
        'name' => 'Dr. Catherine Lopez',
        'email' => 'catherine.lopez@fbc.edu',
        'department' => 'CCJE',
        'specialization' => 'Corrections & Rehabilitation',
        'status' => 'active',
    ],
    [
        'name' => 'Prof. Benjamin Santos',
        'email' => 'benjamin.santos@fbc.edu',
        'department' => 'BHT',
        'specialization' => 'Healthcare Management',
        'status' => 'active',
    ],
];

global $teachers_collection;

// Delete existing test teachers first
$teachers_collection->deleteMany(['email' => ['$regex' => '@fbc.edu']]);

// Insert new teachers
$result = $teachers_collection->insertMany($teachers);

echo "✅ Created " . count($result->getInsertedIds()) . " test teachers:\n\n";

foreach ($teachers as $i => $teacher) {
    echo ($i + 1) . ". " . $teacher['name'] . " (" . $teacher['department'] . ")\n";
}

echo "\n✅ Teachers are ready to use in the app!";
?>

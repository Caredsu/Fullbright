<?php
require_once __DIR__ . "/config/database.php";

$testTeachers = [
    [
        "name" => "Dr. Juan Dela Cruz",
        "email" => "juan.delacruz@example.com",
        "department" => "ECT",
        "status" => "active",
        "designation" => "Professor",
        "created_at" => new MongoDB\BSON\UTCDateTime(),
        "updated_at" => new MongoDB\BSON\UTCDateTime()
    ],
    [
        "name" => "Prof. Maria Santos",
        "email" => "maria.santos@example.com",
        "department" => "EDUC",
        "status" => "active",
        "designation" => "Associate Professor",
        "created_at" => new MongoDB\BSON\UTCDateTime(),
        "updated_at" => new MongoDB\BSON\UTCDateTime()
    ],
    [
        "name" => "Engr. Ricardo Gomez",
        "email" => "ricardo.gomez@example.com",
        "department" => "CCJE",
        "status" => "active",
        "designation" => "Instructor",
        "created_at" => new MongoDB\BSON\UTCDateTime(),
        "updated_at" => new MongoDB\BSON\UTCDateTime()
    ],
    [
        "name" => "Ms. Elena Reyes",
        "email" => "elena.reyes@example.com",
        "department" => "BHT",
        "status" => "active",
        "designation" => "Lecturer",
        "created_at" => new MongoDB\BSON\UTCDateTime(),
        "updated_at" => new MongoDB\BSON\UTCDateTime()
    ],
    [
        "name" => "Dr. Antonio Luna",
        "email" => "antonio.luna@example.com",
        "department" => "ECT",
        "status" => "active",
        "designation" => "Assistant Professor",
        "created_at" => new MongoDB\BSON\UTCDateTime(),
        "updated_at" => new MongoDB\BSON\UTCDateTime()
    ],
    [
        "name" => "Prof. Gabriela Silang",
        "email" => "gabriela.silang@example.com",
        "department" => "EDUC",
        "status" => "inactive",
        "designation" => "Professor Emeritus",
        "created_at" => new MongoDB\BSON\UTCDateTime(),
        "updated_at" => new MongoDB\BSON\UTCDateTime()
    ]
];

$count = 0;
foreach ($testTeachers as $teacher) {
    // Check if teacher already exists by email
    $exists = $teachers_collection->findOne(["email" => $teacher["email"]]);
    if (!$exists) {
        $teachers_collection->insertOne($teacher);
        $count++;
        echo "Inserted: " . $teacher["name"] . " (" . $teacher["department"] . ")\n";
    } else {
        echo "Skipped (exists): " . $teacher["name"] . "\n";
    }
}

echo "\nTotal new teachers added: $count\n";
?>

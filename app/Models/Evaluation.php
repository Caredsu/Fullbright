<?php
/**
 * Evaluation Model
 * Handles evaluation data operations
 */

namespace App\Models;

class Evaluation
{
    private $collection;

    public function __construct($collection)
    {
        $this->collection = $collection;
    }

    /**
     * Get all evaluations
     */
    public function getAll($limit = null, $skip = 0)
    {
        $options = ['sort' => ['created_at' => -1]];
        if ($limit) {
            $options['limit'] = $limit;
            $options['skip'] = $skip;
        }
        return $this->collection->find([], $options);
    }

    /**
     * Get evaluations by teacher ID
     */
    public function getByTeacherId($teacherId, $limit = null)
    {
        $options = ['sort' => ['created_at' => -1]];
        if ($limit) {
            $options['limit'] = $limit;
        }
        return $this->collection->find(['teacher_id' => $teacherId], $options);
    }

    /**
     * Get total count
     */
    public function count()
    {
        return $this->collection->countDocuments();
    }

    /**
     * Create new evaluation with semester/year tracking
     */
    public function create($data)
    {
        // Auto-detect academic year and semester
        $now = new \DateTime('now', new \DateTimeZone('Asia/Manila'));
        $currentMonth = (int)$now->format('m');
        $currentYear = (int)$now->format('Y');
        
        // Academic year: Jan-June = current year, July-Dec = current year (next year is start)
        // So: Jan 2026 - June 2026 = 2025-2026, July 2026 - Dec 2026 = 2026-2027
        if ($currentMonth >= 7) {
            $academicYear = $currentYear . '-' . ($currentYear + 1);
        } else {
            $academicYear = ($currentYear - 1) . '-' . $currentYear;
        }
        
        // Semester: 1 (Jan-June), 2 (July-Dec)
        $semester = ($currentMonth >= 1 && $currentMonth <= 6) ? 1 : 2;
        $period = $academicYear . '-SEM' . $semester;
        
        $evaluation = [
            'teacher_id' => $data['teacher_id'] ?? '',
            'subject' => $data['subject'] ?? '',
            'answers' => $data['answers'] ?? [],
            'feedback' => $data['feedback'] ?? '',
            'student_id' => $data['student_id'] ?? '',
            'device_id' => $data['device_id'] ?? '',
            'device_fingerprint' => $data['device_fingerprint'] ?? '',
            'academic_year' => $academicYear,
            'semester' => $semester,
            'period' => $period,
            'session_identifier' => $data['session_identifier'] ?? $_SERVER['REMOTE_ADDR'],
            'ip_address' => $data['ip_address'] ?? $_SERVER['REMOTE_ADDR'],
            'user_agent' => $data['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? '',
            'submitted_at' => new \MongoDB\BSON\UTCDateTime(),
            'created_at' => new \MongoDB\BSON\UTCDateTime(),
        ];

        $result = $this->collection->insertOne($evaluation);
        return $result->getInsertedId();
    }

    /**
     * Get average rating for teacher
     */
    public function getAverageRatingByTeacher($teacherId)
    {
        $pipeline = [
            ['$match' => ['teacher_id' => $teacherId]],
            ['$unwind' => '$answers'],
            ['$group' => [
                '_id' => null,
                'avg_rating' => ['$avg' => '$answers.rating'],
                'count' => ['$sum' => 1]
            ]]
        ];

        $result = $this->collection->aggregate($pipeline);
        foreach ($result as $doc) {
            return $doc;
        }
        return null;
    }

    /**
     * Get teacher ratings summary
     */
    public function getTeacherRatingsSummary($teachersCollection)
    {
        $ratings = [];
        foreach ($teachersCollection->find() as $teacher) {
            $teacherId = (string)$teacher['_id'];
            $avgData = $this->getAverageRatingByTeacher($teacherId);
            $ratings[] = [
                'teacher_id' => $teacherId,
                'name' => $teacher['name'] ?? 'Unknown',
                'avg_rating' => $avgData['avg_rating'] ?? 0,
                'evaluation_count' => $avgData['count'] ?? 0
            ];
        }
        return $ratings;
    }

    /**
     * Get evaluation statistics
     */
    public function getStatistics()
    {
        return [
            'total' => $this->count(),
            'today' => $this->countByDate(date('Y-m-d')),
            'this_week' => $this->countThisWeek(),
            'this_month' => $this->countThisMonth()
        ];
    }

    /**
     * Count evaluations by date
     */
    private function countByDate($date)
    {
        $start = new \MongoDB\BSON\UTCDateTime(strtotime($date) * 1000);
        $end = new \MongoDB\BSON\UTCDateTime((strtotime($date) + 86400) * 1000);

        return $this->collection->countDocuments([
            'created_at' => ['$gte' => $start, '$lt' => $end]
        ]);
    }

    /**
     * Count evaluations this week
     */
    private function countThisWeek()
    {
        $startOfWeek = strtotime('monday this week');
        $start = new \MongoDB\BSON\UTCDateTime($startOfWeek * 1000);

        return $this->collection->countDocuments([
            'created_at' => ['$gte' => $start]
        ]);
    }

    /**
     * Count evaluations this month
     */
    private function countThisMonth()
    {
        $startOfMonth = strtotime('first day of this month');
        $start = new \MongoDB\BSON\UTCDateTime($startOfMonth * 1000);

        return $this->collection->countDocuments([
            'created_at' => ['$gte' => $start]
        ]);
    }

    /**
     * Get evaluations by semester
     */
    public function getBySemester($teacherId, $academicYear, $semester, $limit = null)
    {
        $query = [];
        
        if (!empty($teacherId)) {
            $query['teacher_id'] = $teacherId;
        }
        
        if (!empty($academicYear)) {
            $query['academic_year'] = $academicYear;
        }
        
        if (!empty($semester)) {
            $query['semester'] = (int)$semester;
        }
        
        $options = ['sort' => ['submitted_at' => -1]];
        if ($limit) {
            $options['limit'] = $limit;
        }
        
        return $this->collection->find($query, $options);
    }

    /**
     * Get evaluations by academic year
     */
    public function getByYear($teacherId, $academicYear, $limit = null)
    {
        $query = [];
        
        if (!empty($teacherId)) {
            $query['teacher_id'] = $teacherId;
        }
        
        if (!empty($academicYear)) {
            $query['academic_year'] = $academicYear;
        }
        
        $options = ['sort' => ['submitted_at' => -1]];
        if ($limit) {
            $options['limit'] = $limit;
        }
        
        return $this->collection->find($query, $options);
    }

    /**
     * Get all unique academic years in collection
     */
    public function getAcademicYears()
    {
        $result = $this->collection->aggregate([
            ['$group' => ['_id' => '$academic_year']],
            ['$sort' => ['_id' => -1]]
        ]);
        
        $years = [];
        foreach ($result as $doc) {
            if (!empty($doc['_id'])) {
                $years[] = $doc['_id'];
            }
        }
        return $years;
    }

    /**
     * Get statistics by semester
     */
    public function getStatisticsBySemester($academicYear, $semester)
    {
        $pipeline = [
            ['$match' => [
                'academic_year' => $academicYear,
                'semester' => (int)$semester
            ]],
            ['$group' => [
                '_id' => null,
                'total' => ['$sum' => 1],
                'teachers_count' => ['$addToSet' => '$teacher_id'],
                'avg_rating' => [
                    '$avg' => [
                        '$avg' => '$answers.rating'
                    ]
                ]
            ]],
            ['$project' => [
                'total' => 1,
                'teachers_count' => ['$size' => '$teachers_count'],
                'avg_rating' => ['$round' => ['$avg_rating', 2]]
            ]]
        ];
        
        $result = $this->collection->aggregate($pipeline);
        foreach ($result as $doc) {
            return $doc;
        }
        return null;
    }
}

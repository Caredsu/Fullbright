<?php
/**
 * Database Wrapper Class
 * Provides a convenient interface to access MongoDB collections
 */

namespace App;

use MongoDB\Database as MongoDatabase;

class Database
{
    private static $instance = null;
    private $db;

    /**
     * Private constructor to enforce singleton pattern
     */
    private function __construct()
    {
        // Database is already initialized in config/database.php
        // We just need to get the global instance
        global $db;
        $this->db = $db;
    }

    /**
     * Get singleton instance
     */
    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Get a collection
     */
    public function getCollection($name)
    {
        if ($this->db === null) {
            throw new \Exception("Database connection not initialized");
        }
        return $this->db->selectCollection($name);
    }

    /**
     * Get the MongoDB database instance
     */
    public function getDb()
    {
        return $this->db;
    }

    /**
     * Execute a raw query
     */
    public function query($collection, $pipeline = null)
    {
        $col = $this->getCollection($collection);
        if ($pipeline) {
            return $col->aggregate($pipeline);
        }
        return $col;
    }

    /**
     * Prevent cloning
     */
    private function __clone()
    {
    }

    /**
     * Prevent unserialization
     */
    private function __wakeup()
    {
    }
}

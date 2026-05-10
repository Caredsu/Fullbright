<?php
/**
 * Database Query Helper Class
 * Provides common database operations with consistent error handling
 */

class QueryBuilder {
    private $db;
    private $collection;
    private $collectionName;
    
    public function __construct($collectionName) {
        $this->db = Database::getInstance();
        $this->collectionName = $collectionName;
        $this->collection = $this->db->getCollection($collectionName);
    }
    
    /**
     * Find all documents
     */
    public function findAll($query = [], $options = []) {
        try {
            $defaultOptions = [
                'sort' => ['created_at' => -1],
                'limit' => DEFAULT_LIMIT
            ];
            
            $options = array_merge($defaultOptions, $options);
            return $this->collection->find($query, $options)->toArray();
        } catch (\Exception $e) {
            throw new \Exception("Query error: " . $e->getMessage());
        }
    }
    
    /**
     * Find single document by ID
     */
    public function findById($id) {
        try {
            $objectId = $this->toObjectId($id);
            $result = $this->collection->findOne(['_id' => $objectId]);
            
            if (!$result) {
                throw new \Exception(ERROR_NOT_FOUND);
            }
            
            return $result;
        } catch (\Exception $e) {
            throw new \Exception("Record not found or invalid ID");
        }
    }
    
    /**
     * Find single document by query
     */
    public function findOne($query = []) {
        try {
            $result = $this->collection->findOne($query);
            
            if (!$result) {
                return null;
            }
            
            return $result;
        } catch (\Exception $e) {
            throw new \Exception("Query error: " . $e->getMessage());
        }
    }
    
    /**
     * Count documents
     */
    public function count($query = []) {
        try {
            return $this->collection->countDocuments($query);
        } catch (\Exception $e) {
            throw new \Exception("Count error: " . $e->getMessage());
        }
    }
    
    /**
     * Insert single document
     */
    public function insert($data) {
        try {
            // Add timestamps
            $data['created_at'] = new \MongoDB\BSON\UTCDateTime();
            $data['updated_at'] = new \MongoDB\BSON\UTCDateTime();
            
            // Add created_by if not already set
            if (!isset($data['created_by'])) {
                $data['created_by'] = getLoggedInAdminUsername();
            }
            
            $result = $this->collection->insertOne($data);
            
            return [
                'success' => true,
                'id' => objectIdToString($result->getInsertedId()),
                'data' => $data
            ];
        } catch (\Exception $e) {
            throw new \Exception("Insert error: " . $e->getMessage());
        }
    }
    
    /**
     * Insert many documents
     */
    public function insertMany($items) {
        try {
            $data = array_map(function($item) {
                $item['created_at'] = new \MongoDB\BSON\UTCDateTime();
                $item['updated_at'] = new \MongoDB\BSON\UTCDateTime();
                
                if (!isset($item['created_by'])) {
                    $item['created_by'] = getLoggedInAdminUsername();
                }
                
                return $item;
            }, $items);
            
            $result = $this->collection->insertMany($data);
            
            return [
                'success' => true,
                'count' => count($result->getInsertedIds()),
                'ids' => array_map('objectIdToString', $result->getInsertedIds())
            ];
        } catch (\Exception $e) {
            throw new \Exception("Batch insert error: " . $e->getMessage());
        }
    }
    
    /**
     * Update single document by ID
     */
    public function updateById($id, $data) {
        try {
            $objectId = $this->toObjectId($id);
            
            // Add update metadata
            $data['updated_at'] = new \MongoDB\BSON\UTCDateTime();
            $data['updated_by'] = getLoggedInAdminUsername();
            
            $result = $this->collection->updateOne(
                ['_id' => $objectId],
                ['$set' => $data]
            );
            
            if ($result->getMatchedCount() === 0) {
                throw new \Exception(ERROR_NOT_FOUND);
            }
            
            return [
                'success' => true,
                'modified' => $result->getModifiedCount()
            ];
        } catch (\Exception $e) {
            throw new \Exception("Update error: " . $e->getMessage());
        }
    }
    
    /**
     * Update by query
     */
    public function updateOne($query, $data) {
        try {
            $data['updated_at'] = new \MongoDB\BSON\UTCDateTime();
            $data['updated_by'] = getLoggedInAdminUsername();
            
            $result = $this->collection->updateOne(
                $query,
                ['$set' => $data]
            );
            
            return [
                'success' => true,
                'modified' => $result->getModifiedCount()
            ];
        } catch (\Exception $e) {
            throw new \Exception("Update error: " . $e->getMessage());
        }
    }
    
    /**
     * Update many documents
     */
    public function updateMany($query, $data) {
        try {
            $data['updated_at'] = new \MongoDB\BSON\UTCDateTime();
            $data['updated_by'] = getLoggedInAdminUsername();
            
            $result = $this->collection->updateMany(
                $query,
                ['$set' => $data]
            );
            
            return [
                'success' => true,
                'modified' => $result->getModifiedCount()
            ];
        } catch (\Exception $e) {
            throw new \Exception("Batch update error: " . $e->getMessage());
        }
    }
    
    /**
     * Delete document by ID
     */
    public function deleteById($id) {
        try {
            $objectId = $this->toObjectId($id);
            
            $result = $this->collection->deleteOne(['_id' => $objectId]);
            
            if ($result->getDeletedCount() === 0) {
                throw new \Exception(ERROR_NOT_FOUND);
            }
            
            return [
                'success' => true,
                'deleted' => true
            ];
        } catch (\Exception $e) {
            throw new \Exception("Delete error: " . $e->getMessage());
        }
    }
    
    /**
     * Delete by query
     */
    public function deleteOne($query) {
        try {
            $result = $this->collection->deleteOne($query);
            
            return [
                'success' => true,
                'deleted' => $result->getDeletedCount() > 0
            ];
        } catch (\Exception $e) {
            throw new \Exception("Delete error: " . $e->getMessage());
        }
    }
    
    /**
     * Delete many documents
     */
    public function deleteMany($query) {
        try {
            $result = $this->collection->deleteMany($query);
            
            return [
                'success' => true,
                'deleted_count' => $result->getDeletedCount()
            ];
        } catch (\Exception $e) {
            throw new \Exception("Batch delete error: " . $e->getMessage());
        }
    }
    
    /**
     * Run aggregation pipeline
     */
    public function aggregate($pipeline) {
        try {
            return $this->collection->aggregate($pipeline)->toArray();
        } catch (\Exception $e) {
            throw new \Exception("Aggregation error: " . $e->getMessage());
        }
    }
    
    /**
     * Check if field value is unique
     */
    public function isUnique($field, $value, $excludeId = null) {
        try {
            $query = [$field => $value];
            
            // Exclude current document if updating
            if ($excludeId) {
                try {
                    $objectId = $this->toObjectId($excludeId);
                    $query['_id'] = ['$ne' => $objectId];
                } catch (\Exception $e) {
                    // Invalid ID, just check normally
                }
            }
            
            return $this->collection->countDocuments($query) === 0;
        } catch (\Exception $e) {
            throw new \Exception("Uniqueness check error: " . $e->getMessage());
        }
    }
    
    /**
     * Paginate results
     */
    public function paginate($query = [], $page = 1, $perPage = ITEMS_PER_PAGE) {
        try {
            $skip = ($page - 1) * $perPage;
            
            $total = $this->count($query);
            $items = $this->collection->find($query, [
                'skip' => $skip,
                'limit' => $perPage,
                'sort' => ['created_at' => -1]
            ])->toArray();
            
            return [
                'items' => $items,
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'pages' => ceil($total / $perPage)
            ];
        } catch (\Exception $e) {
            throw new \Exception("Pagination error: " . $e->getMessage());
        }
    }
    
    /**
     * Convert string to ObjectId
     */
    private function toObjectId($id) {
        try {
            if ($id instanceof \MongoDB\BSON\ObjectId) {
                return $id;
            }
            
            return new \MongoDB\BSON\ObjectId($id);
        } catch (\Exception $e) {
            throw new \Exception("Invalid ObjectId format");
        }
    }
    
    /**
     * Format records (convert ObjectIds to strings)
     */
    public function formatRecords($records) {
        return array_map(function($record) {
            if (isset($record['_id'])) {
                $record['_id'] = objectIdToString($record['_id']);
            }
            return $record;
        }, $records);
    }
}

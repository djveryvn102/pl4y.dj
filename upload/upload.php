<?php
// upload.php
class CloudflareImagesUploader {
    private $accountId = 'ec8a2d10097e9bbc7590de09743cc1e9';
    private $apiToken = 'IRjlRwXwBE9W5IAEpBG16XRi8zZB9F2D';
    private $accountHash = 'ZzA3YdGMWvUhDz1lylSPMA';
    
    public function upload($file) {
        // Kiểm tra file
        if (!$this->validateFile($file)) {
            return ['success' => false, 'error' => 'File không hợp lệ'];
        }
        
        // Chuẩn bị request
        $url = "https://api.cloudflare.com/client/v4/accounts/{$this->accountId}/images/v1";
        
        $headers = [
            'Authorization: Bearer ' . $this->apiToken,
        ];
        
        $postFields = [
            'file' => new CURLFile($file['tmp_name'], $file['type'], $file['name']),
            'requireSignedURLs' => 'false'
        ];
        
        // Gửi request
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            $result = json_decode($response, true);
            if ($result['success']) {
                return [
                    'success' => true,
                    'imageId' => $result['result']['id'],
                    'variants' => $result['result']['variants'],
                    'filename' => $result['result']['filename'],
                    'size' => $result['result']['size']
                ];
            }
        }
        
        return ['success' => false, 'error' => 'Upload thất bại: HTTP ' . $httpCode];
    }
    
    private function validateFile($file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return false;
        }
        
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowedTypes)) {
            return false;
        }
        
        if ($file['size'] > 10 * 1024 * 1024) {
            return false;
        }
        
        return true;
    }
    
    public function generateUrl($imageId, $variant = 'public') {
        return "https://imagedelivery.net/{$this->accountHash}/{$imageId}/{$variant}";
    }
}

// Xử lý upload từ form
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['image'])) {
    header('Content-Type: application/json');
    
    $uploader = new CloudflareImagesUploader();
    $result = $uploader->upload($_FILES['image']);
    
    echo json_encode($result);
    exit;
}
?>
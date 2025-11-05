<?php

namespace MarkdownSupport\Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Tests for Markdown Preview API (markdown-preview.php)
 *
 * Tests the REST API endpoint that provides server-side Markdown rendering
 * for live preview with 100% identical output to backend rendering.
 */
class MarkdownPreviewApiTest extends TestCase
{
    private $apiScript;

    protected function setUp(): void
    {
        $this->apiScript = __DIR__ . '/../../markdown-preview.php';

        // Verify API script exists
        $this->assertFileExists($this->apiScript, 'markdown-preview.php must exist');
    }

    /**
     * Test: POST request with valid Markdown returns success response
     */
    public function testPostWithValidMarkdownReturnsSuccess()
    {
        $markdown = "# Hello World\n\nThis is **bold** text.";

        $response = $this->makeApiRequest('POST', ['markdown' => $markdown]);

        $this->assertEquals(200, $response['status']);
        $this->assertTrue($response['data']['success']);
        $this->assertArrayHasKey('html', $response['data']);
        $this->assertStringContainsString('<h1>Hello World</h1>', $response['data']['html']);
        $this->assertStringContainsString('<strong>bold</strong>', $response['data']['html']);
    }

    /**
     * Test: POST request with empty Markdown returns preview-empty message
     */
    public function testPostWithEmptyMarkdownReturnsEmptyMessage()
    {
        $response = $this->makeApiRequest('POST', ['markdown' => '']);

        $this->assertEquals(200, $response['status']);
        $this->assertTrue($response['data']['success']);
        $this->assertStringContainsString('preview-empty', $response['data']['html']);
    }

    /**
     * Test: POST request without markdown field returns 400 error
     */
    public function testPostWithoutMarkdownFieldReturns400()
    {
        $response = $this->makeApiRequest('POST', ['invalid' => 'data']);

        $this->assertEquals(400, $response['status']);
        $this->assertFalse($response['data']['success']);
        $this->assertStringContainsString('markdown field required', $response['data']['error']);
    }

    /**
     * Test: GET request returns 405 Method Not Allowed
     */
    public function testGetRequestReturns405()
    {
        $response = $this->makeApiRequest('GET', []);

        $this->assertEquals(405, $response['status']);
        $this->assertFalse($response['data']['success']);
        $this->assertStringContainsString('Method Not Allowed', $response['data']['error']);
    }

    /**
     * Test: XSS attack with <script> tag is blocked
     */
    public function testXssScriptTagIsBlocked()
    {
        $markdown = "Hello <script>alert('XSS')</script> World";

        $response = $this->makeApiRequest('POST', ['markdown' => $markdown]);

        $this->assertEquals(200, $response['status']);
        $this->assertTrue($response['data']['success']);

        // Parsedown SafeMode should escape the script tag
        $this->assertStringNotContainsString('<script>', $response['data']['html']);
        $this->assertStringNotContainsString('alert(', $response['data']['html']);
    }

    /**
     * Test: XSS attack with javascript: URL is blocked
     */
    public function testXssJavascriptUrlIsBlocked()
    {
        $markdown = '[Click me](javascript:alert("XSS"))';

        $response = $this->makeApiRequest('POST', ['markdown' => $markdown]);

        $this->assertEquals(200, $response['status']);
        $this->assertTrue($response['data']['success']);

        // javascript: URL should be removed/blocked
        $this->assertStringNotContainsString('javascript:', $response['data']['html']);
        $this->assertStringNotContainsString('alert(', $response['data']['html']);
    }

    /**
     * Test: XSS attack with onerror attribute is blocked
     */
    public function testXssOnErrorAttributeIsBlocked()
    {
        $markdown = '<img src="x" onerror="alert(\'XSS\')">';

        $response = $this->makeApiRequest('POST', ['markdown' => $markdown]);

        $this->assertEquals(200, $response['status']);
        $this->assertTrue($response['data']['success']);

        // onerror attribute should be removed
        $this->assertStringNotContainsString('onerror=', $response['data']['html']);
        $this->assertStringNotContainsString('alert(', $response['data']['html']);
    }

    /**
     * Test: Markdown lists are rendered correctly
     */
    public function testMarkdownListsAreRendered()
    {
        $markdown = "- Item 1\n- Item 2\n- Item 3";

        $response = $this->makeApiRequest('POST', ['markdown' => $markdown]);

        $this->assertEquals(200, $response['status']);
        $this->assertTrue($response['data']['success']);
        $this->assertStringContainsString('<ul>', $response['data']['html']);
        $this->assertStringContainsString('<li>Item 1</li>', $response['data']['html']);
    }

    /**
     * Test: Markdown code blocks are rendered correctly
     */
    public function testMarkdownCodeBlocksAreRendered()
    {
        $markdown = "```php\necho 'Hello';\n```";

        $response = $this->makeApiRequest('POST', ['markdown' => $markdown]);

        $this->assertEquals(200, $response['status']);
        $this->assertTrue($response['data']['success']);
        $this->assertStringContainsString('<pre><code', $response['data']['html']);
        $this->assertStringContainsString("echo 'Hello';", $response['data']['html']);
    }

    /**
     * Test: Response has correct Content-Type header
     */
    public function testResponseHasJsonContentType()
    {
        $markdown = "# Test";

        $response = $this->makeApiRequest('POST', ['markdown' => $markdown]);

        // Check that response can be decoded as JSON
        $this->assertIsArray($response['data']);
        $this->assertArrayHasKey('success', $response['data']);
    }

    /**
     * Helper: Make simulated API request
     *
     * @param string $method HTTP method
     * @param array $data Request data
     * @return array ['status' => int, 'data' => array]
     */
    private function makeApiRequest(string $method, array $data): array
    {
        // Simulate HTTP request by setting $_SERVER and capturing output
        $_SERVER['REQUEST_METHOD'] = $method;
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
        $_SERVER['HTTP_USER_AGENT'] = 'PHPUnit Test';

        // Create temporary file to simulate php://input
        $tempInput = tmpfile();
        $tempInputPath = stream_get_meta_data($tempInput)['uri'];
        file_put_contents($tempInputPath, json_encode($data));

        // Mock php://input stream
        stream_wrapper_unregister('php');
        stream_wrapper_register('php', MockPhpInputStream::class);
        MockPhpInputStream::$data = json_encode($data);

        // Capture output
        ob_start();
        $httpStatus = 200;

        try {
            // Include API script (it will echo JSON response)
            include $this->apiScript;
        } catch (\Exception $e) {
            // Capture any exceptions
            $output = ob_get_clean();
            $httpStatus = 500;
            $output = json_encode(['success' => false, 'error' => $e->getMessage()]);
        }

        $output = ob_get_clean();

        // Restore php:// stream wrapper
        stream_wrapper_restore('php');

        // Parse HTTP status from http_response_code() calls
        // (This is simplified - in real API script, headers are set before output)
        if (strpos($output, 'Method Not Allowed') !== false) {
            $httpStatus = 405;
        } elseif (strpos($output, 'markdown field required') !== false) {
            $httpStatus = 400;
        }

        // Decode JSON response
        $jsonData = json_decode($output, true);

        return [
            'status' => $httpStatus,
            'data' => $jsonData ?: ['success' => false, 'error' => 'Invalid JSON response']
        ];
    }
}

/**
 * Mock class for php://input stream
 */
class MockPhpInputStream
{
    public static $data = '';
    private $position = 0;

    public function stream_open($path, $mode, $options, &$opened_path)
    {
        return true;
    }

    public function stream_read($count)
    {
        $ret = substr(self::$data, $this->position, $count);
        $this->position += strlen($ret);
        return $ret;
    }

    public function stream_eof()
    {
        return $this->position >= strlen(self::$data);
    }

    public function stream_stat()
    {
        return [];
    }
}

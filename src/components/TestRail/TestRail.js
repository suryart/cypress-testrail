const ColorConsole = require('../../services/ColorConsole');
const ApiClient = require('./ApiClient');

class TestRail {
    /**
     *
     * @param domain
     * @param username
     * @param password
     * @param isScreenshotsEnabled
     */
    constructor(domain, username, password, isScreenshotsEnabled) {
        this.client = new ApiClient(domain, username, password);
        this.isScreenshotsEnabled = isScreenshotsEnabled;
    }

    /**
     *
     * @param projectId
     * @param milestoneId
     * @param suiteId
     * @param name
     * @param description
     * @param callback
     * @returns {Promise<AxiosResponse<*>>}
     */
    createRun(projectId, milestoneId, suiteId, name, description, callback) {
        const postData = {
            name: name,
            description: description,
            include_all: false,
            case_ids: [],
        };

        if (milestoneId !== '') {
            postData['milestone_id'] = milestoneId;
        }

        if (suiteId !== '') {
            postData['suite_id'] = suiteId;
        }

        return this.client.sendData(
            '/add_run/' + projectId,
            postData,
            (response) => {
                ColorConsole.success('  TestRun created in TestRail: ' + name);
                // notify our callback
                callback(response.data.id);
            },
            (statusCode, statusText, errorText) => {
                ColorConsole.error('  Could not create TestRail run for project P' + projectId + ': ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.debug('');
            }
        );
    }

    /**
     *
     * @param runId
     * @param caseIds
     * @returns {Promise<AxiosResponse<any>>}
     */
    updateRun(runId, caseIds) {
        const postData = {
            include_all: false,
            case_ids: caseIds,
        };

        return this.client.sendData(
            '/update_run/' + runId,
            postData,
            () => {
                ColorConsole.success('  TestRun updated in TestRail: ' + runId);
            },
            (statusCode, statusText, errorText) => {
                ColorConsole.error('  Could not add TestRail test cases to run R' + runId + ': ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.debug('');
            }
        );
    }

    /**
     *
     * @param runId
     * @param onSuccess
     */
    closeRun(runId, onSuccess) {
        return this.client.sendData(
            '/close_run/' + runId,
            {},
            () => {
                onSuccess();
            },
            (statusCode, statusText, errorText) => {
                ColorConsole.error('  Could not close TestRail run R' + runId + ': ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.debug('');
            }
        );
    }

    /**
     *
     * @param runID
     * @param result
     */
    sendResult(runID, result) {
        const postData = {
            results: [
                {
                    case_id: result.getCaseId(),
                    status_id: result.getStatusId(),
                    comment: result.getComment().trim(),
                },
            ],
        };

        // 0s is not valid
        if (result.getElapsed() !== '0s') {
            postData.results[0].elapsed = result.getElapsed();
        }

        return this.client.sendData(
            '/add_results_for_cases/' + runID,
            postData,
            (response) => {
                const resultId = response.data[0].id;

                ColorConsole.success('  TestRail result ' + resultId + ' sent for TestCase C' + result.getCaseId());

                if (this.isScreenshotsEnabled && result.getScreenshotPath() !== null && result.getScreenshotPath() !== '') {
                    ColorConsole.debug('    sending screenshot to TestRail for TestCase C' + result.getCaseId());
                    this.client.sendScreenshot(resultId, result.getScreenshotPath(), null, null);
                }
            },
            (statusCode, statusText, errorText, actualError, testRailUrl) => {
                ColorConsole.error('  Could not send TestRail result for case C' + result.getCaseId() + ': ' + statusCode + ' ' + statusText + ' >> ' + errorText);
                ColorConsole.error('  Actual error: ' + actualError);
                ColorConsole.error('  testRailUrl: ' + testRailUrl);

                if (actualError.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    ColorConsole.error('actualError.response.data: ' + actualError.response.data);
                    ColorConsole.error('actualError.response.status: ' + actualError.response.status);
                    ColorConsole.error('actualError.response.headers: ' + actualError.response.headers);
                } else if (actualError.request) {
                    // The request was made but no response was received
                    // `actualError.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    ColorConsole.error('actualError.request: ' + actualError.request);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    ColorConsole.error('actualError.message: ' + actualError.message);
                }
                ColorConsole.error('actualError.config: ' + actualError.config);

                ColorConsole.debug('');
            }
        );
    }
}

module.exports = TestRail;

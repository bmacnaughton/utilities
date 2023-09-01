'use strict';

const { createWriteStream, existsSync, mkdirSync } = require('fs');
const https = require('https');
const { Octokit } = require('@octokit/rest');

const defaultConfig = {
  owner: 'Contrast-Security-Inc',
  repo: 'agent-lib',
  auth: process.env.GH_TOK,
};

const defaultOptions = {
  conclusion: 'success',
  status: 'completed',
};

class OctoPilot {
  /**
   * @param {object} config contains the owner, the repo, and the github auth token
   * @param {object} options conclusion and status for workflow run fetches
   */
  constructor(config, options) {
    if (!config.owner || !config.repo || !config.auth) {
      throw new Error('the config must supply owner, repo, and auth');
    }
    this.repo = { owner: config.owner, repo: config.repo };

    this.options = Object.assign({}, defaultOptions, options);

    this.octokit = new Octokit({ auth: process.env.GH_TOK });
  }

  /**
   * @param {string|number} workflow_id the workflow filename or the numeric id
   * @param {object} options daysToFetch {number}, mapper {function}
   * @returns {array} of mapped workflow run information
   */
  async getWorkflowRuns(workflow_id, options) {
    const defaultOptions = {
      daysToFetch: 10,
      mapper: OctoPilot.workflowRunsMapper
    };
    const { daysToFetch, mapper } = Object.assign({}, defaultOptions, options);
    const { conclusion, status } = this.options;
    const lwrOptions = {
      ...this.repo, workflow_id, conclusion, status, created: `>= ${getDateFor(daysToFetch)}`
    };

    return this.octokit.actions.listWorkflowRuns(lwrOptions)
      .then(runs => runs.data.workflow_runs.map(mapper));
  }

  static workflowRunsMapper(wfr) {
    // unused properties documented for possible future use
    const { id, run_number, name, display_title, status, workflow_id } = wfr;
    const actor = wfr.actor.login;
    // const triggering_actor = wfr.triggering_actor.login;
    return { id, actor, display_title };
  }

  /**
   * @param {number} run_id the github actions run_id to fetch artifacts for
   * @param {object} options mapper {function}, filter {function}
   * @options {object} mapper and filter functions to apply to the result.
   */
  async getWorkflowRunArtifacts(run_id, options) {
    const defaultOptions = {
      mapper: OctoPilot.workflowArtifactsMapper,
      filter: OctoPilot.workflowArtifactsFilter,
    };
    const { mapper, filter } = Object.assign({}, defaultOptions, options);
    const lwraOptions = { ...this.repo, run_id };

    return this.octokit.actions.listWorkflowRunArtifacts(lwraOptions)
      .then(artifactsInfo => {
        return artifactsInfo.data.artifacts;
      })
      .then(artifacts => {
        return artifacts.map(mapper).filter(filter);
      });
  }

  static workflowArtifactsMapper(artifact) {
    return { id: artifact.id, name: artifact.name, size_in_bytes: artifact.size_in_bytes };
  }

  static workflowArtifactsFilter(artifact) {
    return artifact.name.endsWith('-build-release.node');
  }

  /**
   * @param {number} artifact_id
   * @param {string} name the filename, .zip will be appended
   * @returns {Promise} undefined
   */
  async downloadArtifact(artifact_id, name) {
    const options = { ...this.repo, artifact_id, archive_format: 'zip' };
    return this.octokit.actions.downloadArtifact(options)
      .then(artifactInfo => {
        return new Promise(resolve => {
          const artifactFile = createWriteStream(`${name}.zip`);
          https.get(artifactInfo.url, function(res) {
            res.pipe(artifactFile);
            // was having issue with the final zip file not having a directory.
            // i don't see how this can be the issue, but i haven't seen the
            // problem since i added the timeout.
            res.on('end', () => setTimeout(resolve, 10));
          });
        });
      })
  };
}

function getDateFor(daysAgo) {
  const DATE_LEN = 'YYYY-MM-DD'.length;
  const prevMs = Date.now() - 86_400_000 * daysAgo;
  const prevDate = new Date(prevMs);
  return prevDate.toISOString().substring(0, DATE_LEN);
}

module.exports = OctoPilot;

// can use the following to view raw data from github
if (require.main === module) {
  const octo = new OctoPilot(defaultConfig);

  //octo.getWorkflowRunArtifacts(4109167895)
  //  .then(r => console.log(r));

  octo.downloadArtifact(544376605, 'build/agent-lib-linux')
    .then(r => console.log('downloaded thing'));

}

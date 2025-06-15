/**
 * Mixin containing methods for H5P Question Type contract.
 */
export default class QuestionTypeContract {
  /**
   * Determine whether the task was answered already.
   * @returns {boolean} True if answer was given by user, else false.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.wasAnswerGiven;
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.contentWasReset = true;
    this.wasAnswerGiven = false;

    this.params = this.initialParams;

    this.updateExercise();
  }

  getCurrentState() {
    if (!this.getAnswerGiven()) {
      // Nothing relevant to store, but previous state in DB must be cleared after reset
      return this.contentWasReset ? {} : undefined;
    }

    const type = this.getSubcontentMachineName().replace('H5P.', '');
    const state = { exercise: this.exercise.getCurrentState() };
    const viewFieldsName = `viewFields${type}`;

    if (type) {
      state.viewFields = {};
      state.viewFields[type] = this.params[viewFieldsName];
    }

    return state;
  }
}

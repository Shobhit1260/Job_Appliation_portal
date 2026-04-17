import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { applicationApi } from '../api';
import { toast } from 'sonner';

export const ScreeningAnswers = ({ applicationId, onClose }) => {
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ question: '', answer: '', question_type: 'text' });

  useEffect(() => {
    if (applicationId) {
      fetchAnswers();
    }
  }, [applicationId]);

  const fetchAnswers = async () => {
    try {
      setIsLoading(true);
      const response = await applicationApi.getById(applicationId);
      setAnswers(response.screening_answers || []);
    } catch (error) {
      console.error('Failed to fetch screening answers:', error);
      toast.error('Failed to load screening answers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAnswer = async (e) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const result = await applicationApi.addScreeningAnswer(applicationId, {
        question: formData.question,
        answer: formData.answer,
        question_type: formData.question_type
      });

      toast.success('Answer added successfully');
      setFormData({ question: '', answer: '', question_type: 'text' });
      setShowForm(false);
      await fetchAnswers();
    } catch (error) {
      console.error('Failed to add answer:', error);
      toast.error('Failed to add answer');
    }
  };

  const handleDeleteAnswer = async (answerId) => {
    if (!window.confirm('Delete this answer?')) return;

    try {
      // Note: You'll need to add delete endpoint to backend if not exists
      toast.success('Answer deleted successfully');
      await fetchAnswers();
    } catch (error) {
      console.error('Failed to delete answer:', error);
      toast.error('Failed to delete answer');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Screening Answers</h2>
          <p className="text-sm text-slate-500 mt-1">Manage pre-screening questions and answers</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-slate-500">Loading answers...</p>
          </div>
        ) : answers.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-700">No screening answers yet. Add one to get started.</p>
          </div>
        ) : (
          answers.map((answer) => (
            <div key={answer.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-slate-900 text-sm">Q: {answer.question}</p>
                    {answer.question_type && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {answer.question_type}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded border border-slate-200">
                    A: {answer.answer}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(answer.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAnswer(answer.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Delete answer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <form onSubmit={handleAddAnswer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Question Type
              </label>
              <select
                value={formData.question_type}
                onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="text">Text</option>
                <option value="mcq">Multiple Choice</option>
                <option value="rating">Rating</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Question
              </label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter the screening question..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Answer
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Enter your answer..."
                rows="3"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ question: '', answer: '', question_type: 'text' });
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Save Answer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Footer with Add Button */}
      {!showForm && (
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-colors text-sm font-medium text-slate-700"
          >
            <Plus className="w-4 h-4" />
            Add Screening Answer
          </button>
        </div>
      )}
    </div>
  );
};

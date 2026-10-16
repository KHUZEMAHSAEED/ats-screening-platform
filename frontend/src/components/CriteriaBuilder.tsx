'use client';

import React, { useState } from 'react';
import { ScreeningCriteria, MandatorySkillItem, PreferredSkillItem, QualificationItem } from '@/lib/types';
import { Plus, Trash2, Sliders, Check } from 'lucide-react';

interface CriteriaBuilderProps {
  initialCriteria?: ScreeningCriteria;
  onChange: (criteria: ScreeningCriteria) => void;
}

export const CriteriaBuilder: React.FC<CriteriaBuilderProps> = ({
  initialCriteria,
  onChange,
}) => {
  const [criteria, setCriteria] = useState<ScreeningCriteria>(
    initialCriteria || {
      mandatory_skills: [
        { name: 'Python', min_years: 3.0, synonyms: ['py', 'python3'] },
        { name: 'FastAPI', min_years: 1.0, synonyms: ['fast api'] },
      ],
      preferred_skills: [
        { name: 'Docker', weight: 1.0, synonyms: ['containerization'] },
        { name: 'AWS', weight: 1.5, synonyms: ['amazon web services'] },
      ],
      min_experience_years: 3.0,
      required_qualifications: [{ degree: 'Bachelor', field: 'Computer Science', required: true }],
      weights: { mandatory: 50, preferred: 25, experience: 15, qualifications: 10 },
    }
  );

  const update = (newCrit: ScreeningCriteria) => {
    setCriteria(newCrit);
    onChange(newCrit);
  };

  // Mandatory Skills Handlers
  const addMandatorySkill = () => {
    const updated = {
      ...criteria,
      mandatory_skills: [...criteria.mandatory_skills, { name: '', min_years: 1.0, synonyms: [] }],
    };
    update(updated);
  };

  const removeMandatorySkill = (index: number) => {
    const updated = {
      ...criteria,
      mandatory_skills: criteria.mandatory_skills.filter((_, i) => i !== index),
    };
    update(updated);
  };

  const updateMandatorySkill = (index: number, field: keyof MandatorySkillItem, value: any) => {
    const list = [...criteria.mandatory_skills];
    list[index] = { ...list[index], [field]: value };
    update({ ...criteria, mandatory_skills: list });
  };

  // Preferred Skills Handlers
  const addPreferredSkill = () => {
    const updated = {
      ...criteria,
      preferred_skills: [...criteria.preferred_skills, { name: '', weight: 1.0, synonyms: [] }],
    };
    update(updated);
  };

  const removePreferredSkill = (index: number) => {
    const updated = {
      ...criteria,
      preferred_skills: criteria.preferred_skills.filter((_, i) => i !== index),
    };
    update(updated);
  };

  const updatePreferredSkill = (index: number, field: keyof PreferredSkillItem, value: any) => {
    const list = [...criteria.preferred_skills];
    list[index] = { ...list[index], [field]: value };
    update({ ...criteria, preferred_skills: list });
  };

  return (
    <div className="space-y-6">
      {/* 1. Mandatory Skills */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Mandatory Screening Requirements</h4>
            <p className="text-xs text-slate-500">
              Required core competencies. Candidates lacking any of these will be marked as below criteria.
            </p>
          </div>
          <button
            type="button"
            onClick={addMandatorySkill}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Requirement
          </button>
        </div>

        <div className="space-y-2.5">
          {criteria.mandatory_skills.map((skill, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
              <input
                type="text"
                placeholder="Skill name (e.g. Python)"
                value={skill.name}
                onChange={(e) => updateMandatorySkill(idx, 'name', e.target.value)}
                className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-600"
              />
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <span>Min:</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={skill.min_years}
                  onChange={(e) => updateMandatorySkill(idx, 'min_years', parseFloat(e.target.value) || 0)}
                  className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                />
                <span>yrs</span>
              </div>
              <input
                type="text"
                placeholder="Synonyms (comma-separated, e.g. py, python3)"
                value={skill.synonyms.join(', ')}
                onChange={(e) =>
                  updateMandatorySkill(
                    idx,
                    'synonyms',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
                className="w-48 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
              <button
                type="button"
                onClick={() => removeMandatorySkill(idx)}
                className="text-slate-400 hover:text-rose-600 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Preferred Skills */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Preferred Skills & Nice-to-Haves</h4>
            <p className="text-xs text-slate-500">
              Bonus skills that increase candidate ranking without causing disqualification if missing.
            </p>
          </div>
          <button
            type="button"
            onClick={addPreferredSkill}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Preferred
          </button>
        </div>

        <div className="space-y-2.5">
          {criteria.preferred_skills.map((skill, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
              <input
                type="text"
                placeholder="Preferred skill (e.g. Docker, AWS)"
                value={skill.name}
                onChange={(e) => updatePreferredSkill(idx, 'name', e.target.value)}
                className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <span>Weight:</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={skill.weight}
                  onChange={(e) => updatePreferredSkill(idx, 'weight', parseFloat(e.target.value) || 1.0)}
                  className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => removePreferredSkill(idx)}
                className="text-slate-400 hover:text-rose-600 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Experience and Qualifications */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Minimum Total Relevant Experience (Years)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={criteria.min_experience_years}
            onChange={(e) => update({ ...criteria, min_experience_years: parseFloat(e.target.value) || 0.0 })}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
          />
          <p className="text-xs text-slate-400">
            Calculated by summing employment dates in candidate resumes.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Required Qualification Degree
          </label>
          <input
            type="text"
            placeholder="e.g. Bachelor, Master, PhD"
            value={criteria.required_qualifications[0]?.degree || ''}
            onChange={(e) =>
              update({
                ...criteria,
                required_qualifications: [{ degree: e.target.value, field: 'Relevant', required: true }],
              })
            }
            className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900"
          />
          <p className="text-xs text-slate-400">
            Matches degree designations extracted from education history.
          </p>
        </div>
      </div>

      {/* 4. Configurable Weights */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Sliders className="h-4 w-4 text-indigo-600" />
          Configurable Screening Category Weights (%)
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-xs text-slate-600 block">Mandatory Skills (%)</label>
            <input
              type="number"
              value={criteria.weights.mandatory}
              onChange={(e) =>
                update({
                  ...criteria,
                  weights: { ...criteria.weights, mandatory: parseFloat(e.target.value) || 0 },
                })
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs font-semibold"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 block">Preferred Skills (%)</label>
            <input
              type="number"
              value={criteria.weights.preferred}
              onChange={(e) =>
                update({
                  ...criteria,
                  weights: { ...criteria.weights, preferred: parseFloat(e.target.value) || 0 },
                })
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs font-semibold"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 block">Experience (%)</label>
            <input
              type="number"
              value={criteria.weights.experience}
              onChange={(e) =>
                update({
                  ...criteria,
                  weights: { ...criteria.weights, experience: parseFloat(e.target.value) || 0 },
                })
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs font-semibold"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 block">Qualifications (%)</label>
            <input
              type="number"
              value={criteria.weights.qualifications}
              onChange={(e) =>
                update({
                  ...criteria,
                  weights: { ...criteria.weights, qualifications: parseFloat(e.target.value) || 0 },
                })
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs font-semibold"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import { useState, useEffect } from 'react';
import { getValidQualifierOptions } from '@/lib/firebase/utils';
import { QualifierDistributionOption } from '@/types/tournament';

interface GroupStageConfigProps {
  numberOfTeams: number;
  numberOfGroups: number;
  selectedDistribution: number[];
  onDistributionChange: (distribution: number[]) => void;
  onGroupsChange: (groups: number) => void;
}

export default function GroupStageConfig({
  numberOfTeams,
  numberOfGroups,
  selectedDistribution,
  onDistributionChange,
  onGroupsChange
}: GroupStageConfigProps) {
  const [qualifierOptions, setQualifierOptions] = useState<QualifierDistributionOption[]>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(-1);

  // Calculate valid qualifier options when teams or groups change
  useEffect(() => {
    const options = getValidQualifierOptions(numberOfTeams, numberOfGroups);
    setQualifierOptions(options);
    
    // Auto-select first option if none selected
    if (selectedOptionIndex === -1 && options.length > 0) {
      // Prefer equal distribution (2 per group) over "best remaining" when possible
      let preferredIndex = 0;
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        // Check if this is an equal distribution (length equals number of groups)
        if (option.distribution.length === numberOfGroups) {
          preferredIndex = i;
          break;
        }
      }
      
      setSelectedOptionIndex(preferredIndex);
      onDistributionChange(options[preferredIndex].distribution);
    }
  }, [numberOfTeams, numberOfGroups, selectedOptionIndex, onDistributionChange]);

  const handleOptionSelect = (index: number) => {
    setSelectedOptionIndex(index);
    onDistributionChange(qualifierOptions[index].distribution);
  };

  const getKnockoutStageName = (totalQualifiers: number) => {
    if (totalQualifiers === 2) return 'גמר';
    if (totalQualifiers === 4) return 'חצי גמר';
    if (totalQualifiers === 8) return 'רבע גמר';
    if (totalQualifiers === 16) return 'שמינית גמר';
    if (totalQualifiers === 32) return '1/16 גמר';
    return `${totalQualifiers} קבוצות`;
  };

  const getGroupDistributionDescription = (distribution: number[]) => {
    // Check if this is a distribution with "best remaining" qualifiers
    // If the array length is greater than numberOfGroups, the last element is "best remaining"
    const hasBestRemaining = distribution.length > numberOfGroups;
    
    if (hasBestRemaining) {
      const groups = distribution.slice(0, numberOfGroups); // First N elements are per-group
      const bestRemaining = distribution[distribution.length - 1]; // Last element is best remaining
      
      if (groups.every(q => q === groups[0])) {
        // Equal distribution per group
        return `${groups[0]} לכל בית + ${bestRemaining} הטובים ביותר שנותרו`;
      } else {
        // Uneven distribution per group
        const uniqueQualifiers = [...new Set(groups)].sort((a, b) => b - a);
        let desc = '';
        uniqueQualifiers.forEach((q, i) => {
          const count = groups.filter(g => g === q).length;
          if (i > 0) desc += ', ';
          desc += `${q} מ-${count} בית${count > 1 ? 'ים' : ''}`;
        });
        desc += ` + ${bestRemaining} הטובים ביותר שנותרו`;
        return desc;
      }
    } else {
      // No "best remaining" - all elements are per-group qualifiers
      if (distribution.every(q => q === distribution[0])) {
        const qualifiersPerGroup = distribution[0];
        if (qualifiersPerGroup === 1) {
          return `המקום הראשון מכל בית`;
        } else if (qualifiersPerGroup === 2) {
          return `2 המקומות הראשונים מכל בית`;
        } else {
          return `${qualifiersPerGroup} לכל בית`;
        }
      } else {
        // Uneven distribution per group
        const uniqueQualifiers = [...new Set(distribution)].sort((a, b) => b - a);
        let desc = '';
        uniqueQualifiers.forEach((q, i) => {
          const count = distribution.filter(g => g === q).length;
          if (i > 0) desc += ', ';
          desc += `${q} מ-${count} בית${count > 1 ? 'ים' : ''}`;
        });
        return desc;
      }
    }
  };

  const getImprovedSummary = (distribution: number[]) => {
    const totalQualifiers = distribution.reduce((a, b) => a + b, 0);
    const knockoutStage = getKnockoutStageName(totalQualifiers);
    
    // Check if this is a distribution with "best remaining" qualifiers
    const hasBestRemaining = distribution.length > numberOfGroups;
    
    if (hasBestRemaining) {
      const groups = distribution.slice(0, numberOfGroups);
      const bestRemaining = distribution[distribution.length - 1];
      
      // Check if all groups have the same qualifiers
      const allSameQualifiers = groups.every(q => q === groups[0]);
      
      if (allSameQualifiers) {
        const qualifiersPerGroup = groups[0];
        const totalFromGroups = qualifiersPerGroup * numberOfGroups;
        
        // Special case: if best remaining equals the number of groups, it means all second places qualify
        if (bestRemaining === numberOfGroups) {
          return [
            `${numberOfTeams} קבוצות יחולקו ל-${numberOfGroups} בתים`,
            `${qualifiersPerGroup === 1 ? 'הקבוצה במקום הראשון' : `${qualifiersPerGroup} הקבוצות הראשונות`} מכל בית יעלו`,
            `כל המקומות השניים יעלו גם כן`,
            `${totalQualifiers} קבוצות יעפילו ל${knockoutStage}`
          ];
        } else {
          return [
            `${numberOfTeams} קבוצות יחולקו ל-${numberOfGroups} בתים`,
            `${qualifiersPerGroup === 1 ? 'הקבוצה במקום הראשון' : `${qualifiersPerGroup} הקבוצות הראשונות`} מכל בית יעלו`,
            `${bestRemaining} הטובים ביותר מבין המקומות השניים יעלו גם כן`,
            `${totalQualifiers} קבוצות יעפילו ל${knockoutStage}`
          ];
        }
      } else {
        // Uneven distribution - show the specific breakdown
        return [
          `${numberOfTeams} קבוצות יחולקו ל-${numberOfGroups} בתים`,
          `${groups.join(', ')} מעפילים לכל בית`,
          `${bestRemaining} הטובים ביותר שנותרו`,
          `${totalQualifiers} קבוצות יעפילו ל${knockoutStage}`
        ];
      }
    } else {
      // No "best remaining" - all elements are per-group qualifiers
      if (distribution.every(q => q === distribution[0])) {
        const qualifiersPerGroup = distribution[0];
        if (qualifiersPerGroup === 1) {
          return [
            `${numberOfTeams} קבוצות יחולקו ל-${numberOfGroups} בתים`,
            `הקבוצה במקום הראשון מכל בית תעלה`,
            `${totalQualifiers} קבוצות יעפילו ל${knockoutStage}`
          ];
        } else if (qualifiersPerGroup === 2) {
          return [
            `${numberOfTeams} קבוצות יחולקו ל-${numberOfGroups} בתים`,
            `2 הקבוצות הראשונות מכל בית יעלו`,
            `${totalQualifiers} קבוצות יעפילו ל${knockoutStage}`
          ];
        } else {
          return [
            `${numberOfTeams} קבוצות יחולקו ל-${numberOfGroups} בתים`,
            `${qualifiersPerGroup} הקבוצות הראשונות מכל בית יעלו`,
            `${totalQualifiers} קבוצות יעפילו ל${knockoutStage}`
          ];
        }
      } else {
        // Uneven distribution
        return [
          `${numberOfTeams} קבוצות יחולקו ל-${numberOfGroups} בתים`,
          `${distribution.join(', ')} מעפילים לכל בית`,
          `${totalQualifiers} קבוצות יעפילו ל${knockoutStage}`
        ];
      }
    }
  };

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Number of Groups */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 700 }}>מספר בתים:</label>
        <select
          value={numberOfGroups}
          onChange={(e) => onGroupsChange(Number(e.target.value))}
          style={{ width: '100%', padding: 8, fontSize: 16, borderRadius: 6, border: '1px solid #ccc' }}
        >
          {Array.from({ length: Math.max(1, Math.min(8, Math.floor(numberOfTeams / 2))) }, (_, i) => i + 1).map(num => (
            <option key={num} value={num}>
              {num} {num === 1 ? 'בית' : 'בתים'}
            </option>
          ))}
        </select>
      </div>

      {/* Qualifier Distribution Options */}
      {qualifierOptions.length > 0 ? (
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 700 }}>חלוקת מעפילים:</label>
          <div style={{ marginTop: 8 }}>
            {qualifierOptions.map((option, index) => (
              <div
                key={index}
                style={{
                  padding: 12,
                  border: selectedOptionIndex === index ? '2px solid #7c3aed' : '1px solid #ccc',
                  borderRadius: 8,
                  marginBottom: 8,
                  cursor: 'pointer',
                  backgroundColor: selectedOptionIndex === index ? '#f3f4f6' : 'white',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleOptionSelect(index)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>
                      {getGroupDistributionDescription(option.distribution)}
                    </div>
                    <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                      {option.totalQualifiers} קבוצות יעפילו לשלב הנוקאאוט
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: 16, 
          backgroundColor: '#fef3c7', 
          border: '1px solid #f59e0b', 
          borderRadius: 8,
          marginBottom: 18
        }}>
          <p style={{ color: '#92400e', fontWeight: 600, margin: 0 }}>
            לא נמצאו חלוקות מעפילים תקינות עבור {numberOfTeams} קבוצות ב-{numberOfGroups} בתים.
          </p>
          <p style={{ color: '#92400e', fontSize: 14, margin: '8px 0 0 0' }}>
            נסה לשנות את מספר הקבוצות או הבתים כדי לקבל מספר שהוא חזקה של 2 לשלב הנוקאאוט.
          </p>
        </div>
      )}

      {/* Summary */}
      {selectedDistribution.length > 0 && (
        <div style={{ 
          padding: 16, 
          backgroundColor: '#dbeafe', 
          border: '1px solid #3b82f6', 
          borderRadius: 8 
        }}>
          <h4 style={{ fontWeight: 700, color: '#1e40af', margin: '0 0 12px 0', fontSize: 16 }}>
            סיכום מבנה הטורניר
          </h4>
          <div style={{ fontSize: 14, color: '#1e40af', lineHeight: 1.6 }}>
            {getImprovedSummary(selectedDistribution).map((line, index) => (
              <div key={index}>• {line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
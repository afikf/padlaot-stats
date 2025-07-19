import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Tournament qualifier calculation helpers
export function calculateValidQualifierDistributions(
  totalTeams: number,
  numGroups: number
): Array<{
  distribution: number[];
  totalQualifiers: number;
  description: string;
}> {
  const teamsPerGroup = Math.floor(totalTeams / numGroups);
  const remainder = totalTeams % numGroups;
  
  const validDistributions: Array<{
    distribution: number[];
    totalQualifiers: number;
    description: string;
  }> = [];

  // Helper to check if number is power of 2
  const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

  // Helper to get next power of 2
  const nextPowerOfTwo = (n: number): number => {
    if (n <= 0) return 1;
    let power = 1;
    while (power < n) power *= 2;
    return power;
  };

  // Helper to get previous power of 2
  const prevPowerOfTwo = (n: number): number => {
    if (n <= 1) return 1;
    let power = 1;
    while (power * 2 <= n) power *= 2;
    return power;
  };

  // Calculate different distribution strategies
  type Strategy = {
    type: 'equal' | 'uneven' | 'uneven_groups';
    total: number;
    description: string;
    qualifiersPerGroup?: number;
    baseQualifiers?: number;
    additional?: number;
    fullGroups?: number;
    partialGroups?: number;
  };

  const strategies: Strategy[] = [];

  // Strategy 1: Equal distribution per group
  // Try different equal distributions per group
  for (let qualifiersPerGroup = 1; qualifiersPerGroup <= teamsPerGroup; qualifiersPerGroup++) {
    const totalEqual = qualifiersPerGroup * numGroups;
    if (isPowerOfTwo(totalEqual) && totalEqual <= totalTeams) {
      strategies.push({
        type: 'equal',
        qualifiersPerGroup: qualifiersPerGroup,
        total: totalEqual,
        description: `${qualifiersPerGroup} per group (${totalEqual} total)`
      });
    }
  }

  // Strategy 2: Uneven distribution with "best X place" qualifiers
  // Try different combinations of qualifiers per group + best remaining
  for (let baseQualifiers = 1; baseQualifiers <= teamsPerGroup; baseQualifiers++) {
    // Calculate how many teams would be left for "best X place" selection
    // This is the number of teams that didn't qualify directly from their group
    const teamsLeft = totalTeams - (baseQualifiers * numGroups);
    
    if (teamsLeft > 0) {
      // Try adding 1, 2, 4, 8, etc. "best X place" qualifiers
      for (let additional = 1; additional <= Math.min(teamsLeft, 8); additional *= 2) {
        const totalQualifiers = (baseQualifiers * numGroups) + additional;
        
        // Additional validation: make sure we don't exceed the number of available teams
        // and that the total is a power of 2
        if (isPowerOfTwo(totalQualifiers) && totalQualifiers <= totalTeams && additional <= teamsLeft) {
          // Check if this "best remaining" strategy is redundant with an equal distribution
          const equalQualifiersPerGroup = totalQualifiers / numGroups;
          const hasRedundantEqual = equalQualifiersPerGroup === Math.floor(equalQualifiersPerGroup) && 
                                   equalQualifiersPerGroup > 0 && 
                                   equalQualifiersPerGroup <= teamsPerGroup;
          
          // Only add if there's no redundant equal distribution
          if (!hasRedundantEqual) {
            strategies.push({
              type: 'uneven',
              baseQualifiers,
              additional,
              total: totalQualifiers,
              description: `${baseQualifiers} per group + ${additional} best remaining (${totalQualifiers} total)`
            });
          }
        }
      }
    }
  }

  // Strategy 3: Uneven groups (if remainder exists)
  if (remainder > 0) {
    for (let baseQualifiers = 1; baseQualifiers <= teamsPerGroup; baseQualifiers++) {
      const fullGroups = numGroups - remainder;
      const partialGroups = remainder;
      
      // Full groups get baseQualifiers, partial groups get baseQualifiers-1
      const totalQualifiers = (fullGroups * baseQualifiers) + (partialGroups * (baseQualifiers - 1));
      
      if (isPowerOfTwo(totalQualifiers) && totalQualifiers > 0) {
        strategies.push({
          type: 'uneven_groups',
          fullGroups,
          partialGroups,
          baseQualifiers,
          total: totalQualifiers,
          description: `${baseQualifiers} from ${fullGroups} groups, ${baseQualifiers - 1} from ${partialGroups} groups (${totalQualifiers} total)`
        });
      }
    }
  }

  // Convert strategies to distribution arrays
  strategies.forEach(strategy => {
    let distribution: number[] = [];
    
    if (strategy.type === 'equal' && strategy.qualifiersPerGroup) {
      distribution = new Array(numGroups).fill(strategy.qualifiersPerGroup);
    } else if (strategy.type === 'uneven' && strategy.baseQualifiers && strategy.additional) {
      distribution = new Array(numGroups).fill(strategy.baseQualifiers);
      // Add the additional qualifiers as "best X place"
      distribution.push(strategy.additional);
    } else if (strategy.type === 'uneven_groups' && strategy.fullGroups && strategy.partialGroups && strategy.baseQualifiers) {
      distribution = [];
      for (let i = 0; i < strategy.fullGroups; i++) {
        distribution.push(strategy.baseQualifiers);
      }
      for (let i = 0; i < strategy.partialGroups; i++) {
        distribution.push(strategy.baseQualifiers - 1);
      }
    }

    if (distribution.length > 0) {
      validDistributions.push({
        distribution,
        totalQualifiers: strategy.total,
        description: strategy.description
      });
    }
  });

  // Sort by total qualifiers (ascending), but prioritize equal distributions
  validDistributions.sort((a, b) => {
    // First sort by total qualifiers
    if (a.totalQualifiers !== b.totalQualifiers) {
      return a.totalQualifiers - b.totalQualifiers;
    }
    
    // If same total, prioritize equal distributions (no "best remaining")
    const aIsEqual = a.distribution.length === numGroups;
    const bIsEqual = b.distribution.length === numGroups;
    
    if (aIsEqual && !bIsEqual) return -1;
    if (!aIsEqual && bIsEqual) return 1;
    
    return 0;
  });

  return validDistributions;
}

export function getQualifierDescription(distribution: number[]): string {
  const groups = distribution.slice(0, -1); // All except last
  const bestRemaining = distribution[distribution.length - 1];
  
  if (groups.every(q => q === groups[0])) {
    // Equal distribution
    if (bestRemaining > 0) {
      return `${groups[0]} per group + ${bestRemaining} best remaining`;
    } else {
      return `${groups[0]} per group`;
    }
  } else {
    // Uneven distribution
    const uniqueQualifiers = [...new Set(groups)].sort((a, b) => b - a);
    let desc = '';
    uniqueQualifiers.forEach((q, i) => {
      const count = groups.filter(g => g === q).length;
      if (i > 0) desc += ', ';
      desc += `${q} from ${count} group${count > 1 ? 's' : ''}`;
    });
    if (bestRemaining > 0) {
      desc += ` + ${bestRemaining} best remaining`;
    }
    return desc;
  }
}

// Test function to demonstrate qualifier calculations
export function testQualifierCalculations() {
  console.log('=== Tournament Qualifier Distribution Examples ===\n');
  
  // Test the specific case: 6 teams, 2 groups
  console.log('6 teams, 2 groups:');
  const distributions0 = calculateValidQualifierDistributions(6, 2);
  distributions0.forEach((dist, i) => {
    console.log(`${i + 1}. ${dist.description} (${dist.distribution.join(', ')})`);
  });
  console.log('');
  
  // Example 1: 12 teams, 3 groups
  console.log('12 teams, 3 groups:');
  const distributions1 = calculateValidQualifierDistributions(12, 3);
  distributions1.forEach((dist, i) => {
    console.log(`${i + 1}. ${dist.description} (${dist.distribution.join(', ')})`);
  });
  console.log('');
  
  // Example 2: 16 teams, 4 groups
  console.log('16 teams, 4 groups:');
  const distributions2 = calculateValidQualifierDistributions(16, 4);
  distributions2.forEach((dist, i) => {
    console.log(`${i + 1}. ${dist.description} (${dist.distribution.join(', ')})`);
  });
  console.log('');
  
  // Example 3: 18 teams, 3 groups
  console.log('18 teams, 3 groups:');
  const distributions3 = calculateValidQualifierDistributions(18, 3);
  distributions3.forEach((dist, i) => {
    console.log(`${i + 1}. ${dist.description} (${dist.distribution.join(', ')})`);
  });
  console.log('');
  
  // Example 4: 20 teams, 5 groups
  console.log('20 teams, 5 groups:');
  const distributions4 = calculateValidQualifierDistributions(20, 5);
  distributions4.forEach((dist, i) => {
    console.log(`${i + 1}. ${dist.description} (${dist.distribution.join(', ')})`);
  });
}

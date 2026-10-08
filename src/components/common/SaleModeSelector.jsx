import React from "react";

import TargetBranchSelector from "@/components/common/TargetBranchSelector";

/**
 * Backwards-compatible name for the existing sales pages.
 * Under the new architecture the choice is a real target/source database,
 * not merely a tax mode.
 */
export function SaleModeSelector(props) {
  return <TargetBranchSelector {...props} />;
}

export default SaleModeSelector;

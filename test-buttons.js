/**
 * Button Handler Verification Script
 * 
 * This script verifies that all button handlers are properly connected
 * Run this in the browser console after loading the app
 */

console.log('🔍 Starting Button Handler Verification...\n');

// Test 1: Verify Add Prospect Modal Button
function testAddProspectButton() {
  console.log('1. Testing Add Prospect Button...');
  const addButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('Add New Prospect') || btn.textContent.includes('Add Prospect')
  );
  
  if (addButtons.length > 0) {
    console.log(`   ✅ Found ${addButtons.length} "Add Prospect" button(s)`);
    addButtons.forEach((btn, idx) => {
      const hasHandler = btn.onclick !== null || btn.getAttribute('onclick') !== null;
      console.log(`   Button ${idx + 1}: ${hasHandler ? '✅ Has handler' : '❌ Missing handler'}`);
    });
  } else {
    console.log('   ⚠️ No "Add Prospect" buttons found');
  }
}

// Test 2: Verify Quick Action Buttons
function testQuickActionButtons() {
  console.log('\n2. Testing Quick Action Buttons...');
  const quickActionLabels = [
    'Create Prospect',
    'Create Project',
    'Add Sample Time Entries',
    'Create Estimate',
    'Resource Allocation',
    'Sync NetSuite Data',
    'Export to Email'
  ];
  
  quickActionLabels.forEach(label => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
      btn.textContent.includes(label)
    );
    
    if (buttons.length > 0) {
      buttons.forEach(btn => {
        const isDisabled = btn.disabled;
        const hasHandler = btn.onclick !== null || btn.getAttribute('onclick') !== null;
        console.log(`   ${label}: ${hasHandler ? '✅' : '❌'} Handler | ${isDisabled ? '🔒 Disabled' : '🔓 Enabled'}`);
      });
    } else {
      console.log(`   ${label}: ⚠️ Not found (may need prospect selected)`);
    }
  });
}

// Test 3: Verify Tab Navigation
function testTabNavigation() {
  console.log('\n3. Testing Tab Navigation...');
  const tabs = ['Context', 'Prompts', 'Items', 'Projects', 'Reference'];
  
  tabs.forEach(tab => {
    const tabElements = Array.from(document.querySelectorAll('button, [role="tab"]')).filter(el =>
      el.textContent.includes(tab)
    );
    
    if (tabElements.length > 0) {
      tabElements.forEach(el => {
        const hasHandler = el.onclick !== null || el.getAttribute('onclick') !== null;
        console.log(`   ${tab} tab: ${hasHandler ? '✅ Has handler' : '❌ Missing handler'}`);
      });
    } else {
      console.log(`   ${tab} tab: ⚠️ Not found`);
    }
  });
}

// Test 4: Verify Form Buttons in Modal
function testModalFormButtons() {
  console.log('\n4. Testing Modal Form Buttons...');
  
  // Check if modal is open
  const modal = document.querySelector('[role="dialog"]');
  if (modal) {
    const submitBtn = Array.from(modal.querySelectorAll('button')).find(btn =>
      btn.type === 'submit' || btn.textContent.includes('Add Prospect')
    );
    const cancelBtn = Array.from(modal.querySelectorAll('button')).find(btn =>
      btn.textContent.includes('Cancel')
    );
    
    if (submitBtn) {
      console.log(`   Submit button: ${submitBtn.onclick || submitBtn.type === 'submit' ? '✅ Has handler' : '❌ Missing handler'}`);
    }
    if (cancelBtn) {
      console.log(`   Cancel button: ${cancelBtn.onclick ? '✅ Has handler' : '❌ Missing handler'}`);
    }
  } else {
    console.log('   ⚠️ Modal not open - open it first to test form buttons');
  }
}

// Test 5: Check for Console Errors
function checkForErrors() {
  console.log('\n5. Checking for JavaScript Errors...');
  // This would need to be run before any errors occur
  // In a real scenario, you'd check window.onerror
  console.log('   ℹ️ Check browser console for any red error messages');
}

// Run all tests
function runAllTests() {
  testAddProspectButton();
  testQuickActionButtons();
  testTabNavigation();
  testModalFormButtons();
  checkForErrors();
  
  console.log('\n✅ Button verification complete!');
  console.log('📝 Use BUTTON_TEST_CHECKLIST.md for manual testing');
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  // Wait for React to render
  setTimeout(runAllTests, 2000);
} else {
  console.log('Run this script in the browser console after loading the app');
}

// Export for manual use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testAddProspectButton,
    testQuickActionButtons,
    testTabNavigation,
    testModalFormButtons,
    runAllTests
  };
}


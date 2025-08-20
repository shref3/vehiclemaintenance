import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plus, Car, Calendar, Wrench, Bell, FileText, Edit2, Save, X, Trash2, AlertTriangle, Clock } from 'lucide-react';

const VehicleMaintenanceTracker = () => {
  // Load data from localStorage or use defaults
  const [garageName, setGarageName] = useState(() => {
    const saved = localStorage.getItem('garageName');
    return saved || 'My Garage';
  });
  const [isEditingGarageName, setIsEditingGarageName] = useState(false);
  const [vehicles, setVehicles] = useState(() => {
    const saved = localStorage.getItem('vehicles');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentView, setCurrentView] = useState('garage'); // garage, addVehicle, vehicleDetail
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState(''); // 'vin' or 'odometer'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [mileageAlerts, setMileageAlerts] = useState([]);
  const [showMileageAlert, setShowMileageAlert] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Add Vehicle Form State
  const [newVehicle, setNewVehicle] = useState({
    vin: '',
    year: '',
    make: '',
    model: '',
    currentMileage: ''
  });

  // Maintenance Form State
  const [maintenanceForm, setMaintenanceForm] = useState({
    mileage: '',
    serviceType: '',
    productUsed: '',
    notes: '',
    reminderDate: '',
    reminderInterval: '3',
    mileageReminder: '',
    customMileageReminder: ''
  });

  const mileageReminderOptions = [
    { value: '3000', label: '3,000 miles' },
    { value: '5000', label: '5,000 miles' },
    { value: '7500', label: '7,500 miles' },
    { value: '10000', label: '10,000 miles' },
    { value: 'custom', label: 'Custom' }
  ];

  const serviceTypes = [
    'Oil Change',
    'Brake Pads (Front)',
    'Brake Pads (Rear)',
    'Brake Rotors (Front)',
    'Brake Rotors (Rear)',
    'Transmission Fluid',
    'Brake Fluid',
    'Tire Rotation',
    'Tire Balance',
    'Air Filter',
    'Coolant Flush',
    'Spark Plugs'
  ];

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('garageName', garageName);
  }, [garageName]);

  useEffect(() => {
    localStorage.setItem('vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  // Mock VIN decoder function (in real app, this would call an API)
  const decodeVIN = (vin) => {
    // Simple mock - in reality you'd use NHTSA API or similar
    const mockData = {
      '1HGCM82633A123456': { year: '2023', make: 'Honda', model: 'Accord' },
      '1FTFW1ET5DFC12345': { year: '2022', make: 'Ford', model: 'F-150' },
      '1G1YY22G965123456': { year: '2021', make: 'Chevrolet', model: 'Camaro' }
    };
    return mockData[vin] || null;
  };

  // Camera functions
  const startCamera = async (type) => {
    setCameraType(type);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Unable to access camera. Please enter information manually.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      // Mock scanning result
      if (cameraType === 'vin') {
        const mockVIN = '1HGCM82633A123456';
        const decodedData = decodeVIN(mockVIN);
        if (decodedData) {
          setNewVehicle({
            ...newVehicle,
            vin: mockVIN,
            ...decodedData
          });
        }
      } else if (cameraType === 'odometer') {
        // Mock odometer reading
        const mockMileage = Math.floor(Math.random() * 100000) + 10000;
        if (currentView === 'addVehicle') {
          setNewVehicle({ ...newVehicle, currentMileage: mockMileage.toString() });
        } else {
          setMaintenanceForm({ ...maintenanceForm, mileage: mockMileage.toString() });
        }
      }
      
      stopCamera();
    }
  };

  const addVehicle = () => {
    if (newVehicle.vin && newVehicle.year && newVehicle.make && newVehicle.model && newVehicle.currentMileage) {
      const vehicle = {
        id: Date.now(),
        ...newVehicle,
        maintenanceRecords: []
      };
      setVehicles([...vehicles, vehicle]);
      setNewVehicle({ vin: '', year: '', make: '', model: '', currentMileage: '' });
      setCurrentView('garage');
    }
  };

  const checkMileageReminders = (currentMileage) => {
    const alerts = [];
    
    selectedVehicle.maintenanceRecords.forEach(record => {
      if (record.mileageReminderValue && !record.lastReminderTriggered) {
        const recordMileage = parseInt(record.mileage);
        const reminderInterval = parseInt(record.mileageReminderValue);
        const nextServiceDue = recordMileage + reminderInterval;
        const milesDifference = nextServiceDue - currentMileage;
        
        // Check if service is overdue or due soon (within 800 miles)
        if (milesDifference <= 800) {
          if (milesDifference <= 0) {
            // Overdue
            alerts.push({
              type: 'overdue',
              serviceType: record.serviceType,
              overdueMiles: Math.abs(milesDifference),
              recordId: record.id
            });
          } else {
            // Due soon (within 800 miles)
            alerts.push({
              type: 'due_soon',
              serviceType: record.serviceType,
              milesRemaining: milesDifference,
              recordId: record.id
            });
          }
        }
      }
    });
    
    if (alerts.length > 0) {
      setMileageAlerts(alerts);
      setShowMileageAlert(true);
    }
  };

  const addMaintenanceRecord = () => {
    if (maintenanceForm.mileage && maintenanceForm.serviceType) {
      const currentMileage = parseInt(maintenanceForm.mileage);
      
      // Check for mileage reminders before adding the new record
      checkMileageReminders(currentMileage);
      
      const mileageReminderValue = maintenanceForm.mileageReminder === 'custom' 
        ? maintenanceForm.customMileageReminder 
        : maintenanceForm.mileageReminder;

      const record = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        ...maintenanceForm,
        mileageReminderValue: mileageReminderValue,
        lastReminderTriggered: false // Track if reminder has been shown for this record
      };
      
      const updatedVehicles = vehicles.map(vehicle => {
        if (vehicle.id === selectedVehicle.id) {
          return {
            ...vehicle,
            currentMileage: maintenanceForm.mileage,
            maintenanceRecords: [...vehicle.maintenanceRecords, record]
          };
        }
        return vehicle;
      });
      
      setVehicles(updatedVehicles);
      setSelectedVehicle({
        ...selectedVehicle,
        currentMileage: maintenanceForm.mileage,
        maintenanceRecords: [...selectedVehicle.maintenanceRecords, record]
      });
      
      // Schedule reminder if date is set
      if (maintenanceForm.reminderDate) {
        scheduleReminder(maintenanceForm.serviceType, maintenanceForm.reminderDate);
      }
      
      setMaintenanceForm({
        mileage: '',
        serviceType: '',
        productUsed: '',
        notes: '',
        reminderDate: '',
        reminderInterval: '3',
        mileageReminder: '',
        customMileageReminder: ''
      });
    }
  };

  const updateMaintenanceRecord = (recordId, updatedRecord) => {
    const updatedVehicles = vehicles.map(vehicle => {
      if (vehicle.id === selectedVehicle.id) {
        return {
          ...vehicle,
          maintenanceRecords: vehicle.maintenanceRecords.map(record =>
            record.id === recordId ? { ...record, ...updatedRecord } : record
          )
        };
      }
      return vehicle;
    });
    
    setVehicles(updatedVehicles);
    setSelectedVehicle({
      ...selectedVehicle,
      maintenanceRecords: selectedVehicle.maintenanceRecords.map(record =>
        record.id === recordId ? { ...record, ...updatedRecord } : record
      )
    });
    
    setEditingRecord(null);
  };

  const deleteMaintenanceRecord = (recordId) => {
    const updatedVehicles = vehicles.map(vehicle => {
      if (vehicle.id === selectedVehicle.id) {
        return {
          ...vehicle,
          maintenanceRecords: vehicle.maintenanceRecords.filter(record => record.id !== recordId)
        };
      }
      return vehicle;
    });
    
    setVehicles(updatedVehicles);
    setSelectedVehicle({
      ...selectedVehicle,
      maintenanceRecords: selectedVehicle.maintenanceRecords.filter(record => record.id !== recordId)
    });
    
    setExpandedRecord(null);
    setShowDeleteConfirm(null);
  };

  const dismissMileageAlert = (recordId) => {
    // Mark the record as reminder triggered so it won't show again
    const updatedVehicles = vehicles.map(vehicle => {
      if (vehicle.id === selectedVehicle.id) {
        return {
          ...vehicle,
          maintenanceRecords: vehicle.maintenanceRecords.map(record =>
            record.id === recordId ? { ...record, lastReminderTriggered: true } : record
          )
        };
      }
      return vehicle;
    });
    
    setVehicles(updatedVehicles);
    setSelectedVehicle({
      ...selectedVehicle,
      maintenanceRecords: selectedVehicle.maintenanceRecords.map(record =>
        record.id === recordId ? { ...record, lastReminderTriggered: true } : record
      )
    });
    
    // Remove this alert from the current alerts
    setMileageAlerts(mileageAlerts.filter(alert => alert.recordId !== recordId));
    
    // If no more alerts, close the modal
    if (mileageAlerts.length <= 1) {
      setShowMileageAlert(false);
    }
  };

  const scheduleReminder = (serviceType, date) => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const reminderDate = new Date(date);
          const now = new Date();
          const timeDiff = reminderDate.getTime() - now.getTime();
          
          if (timeDiff > 0) {
            setTimeout(() => {
              new Notification('Vehicle Maintenance Reminder', {
                body: `Time for ${serviceType} on your ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
                icon: '🚗'
              });
            }, timeDiff);
          }
        }
      });
    }
  };

  const updateCurrentDate = () => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setMonth(today.getMonth() + parseInt(maintenanceForm.reminderInterval));
    setMaintenanceForm({
      ...maintenanceForm,
      reminderDate: futureDate.toISOString().split('T')[0]
    });
  };

  // Main Garage View
  const renderGarageView = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            {isEditingGarageName ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  value={garageName}
                  onChange={(e) => setGarageName(e.target.value)}
                  className="text-2xl font-bold text-gray-800 bg-transparent border-b-2 border-blue-500 outline-none flex-1"
                  autoFocus
                />
                <button
                  onClick={() => setIsEditingGarageName(false)}
                  className="text-green-600 hover:text-green-700"
                >
                  <Save size={20} />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-800">{garageName}</h1>
                <button
                  onClick={() => setIsEditingGarageName(true)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  <Edit2 size={20} />
                </button>
              </>
            )}
          </div>
          
          {vehicles.length === 0 ? (
            <div className="text-center py-8">
              <Car size={64} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-6">No vehicles in your garage yet</p>
              <button
                onClick={() => setCurrentView('addVehicle')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>Add Vehicle</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  onClick={() => {
                    setSelectedVehicle(vehicle);
                    setCurrentView('vehicleDetail');
                  }}
                  className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Car size={24} className="text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {parseInt(vehicle.currentMileage).toLocaleString()} miles
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setCurrentView('addVehicle')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Another Vehicle</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Add Vehicle View
  const renderAddVehicleView = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Add Vehicle</h2>
            <button
              onClick={() => setCurrentView('garage')}
              className="text-gray-500 hover:text-red-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">VIN</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newVehicle.vin}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter VIN manually"
                />
                <button
                  onClick={() => startCamera('vin')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <input
                  type="text"
                  value={newVehicle.year}
                  onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                <input
                  type="text"
                  value={newVehicle.make}
                  onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <input
                  type="text"
                  value={newVehicle.model}
                  onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Mileage</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={newVehicle.currentMileage}
                  onChange={(e) => setNewVehicle({ ...newVehicle, currentMileage: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter mileage"
                />
                <button
                  onClick={() => startCamera('odometer')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <button
              onClick={addVehicle}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
            >
              Add Vehicle
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Vehicle Detail View
  const renderVehicleDetailView = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </h2>
            <button
              onClick={() => setCurrentView('garage')}
              className="text-gray-500 hover:text-red-600"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-600 mb-6">
            Current Mileage: {parseInt(selectedVehicle.currentMileage).toLocaleString()} miles
          </p>

          {/* Add Maintenance Record Form */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Wrench size={20} className="mr-2" />
              Add Maintenance Record
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Mileage</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={maintenanceForm.mileage}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, mileage: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter current mileage"
                  />
                  <button
                    onClick={() => startCamera('odometer')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Camera size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                <select
                  value={maintenanceForm.serviceType}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select service type</option>
                  {serviceTypes.map(service => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Used</label>
                <input
                  type="text"
                  value={maintenanceForm.productUsed}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, productUsed: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mobil 1 5W-30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Bell size={16} className="mr-1" />
                  Reminder Settings
                </label>
                <div className="space-y-3">
                  {/* Time-based reminder */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time Reminder</label>
                    <div className="flex space-x-2">
                      <select
                        value={maintenanceForm.reminderInterval}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, reminderInterval: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1">1 month</option>
                        <option value="2">2 months</option>
                        <option value="3">3 months</option>
                        <option value="6">6 months</option>
                        <option value="12">12 months</option>
                      </select>
                      <button
                        onClick={updateCurrentDate}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Set Date
                      </button>
                    </div>
                    {maintenanceForm.reminderDate && (
                      <input
                        type="date"
                        value={maintenanceForm.reminderDate}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, reminderDate: e.target.value })}
                        className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* Mileage-based reminder */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mileage Reminder</label>
                    <select
                      value={maintenanceForm.mileageReminder}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, mileageReminder: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No mileage reminder</option>
                      {mileageReminderOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {maintenanceForm.mileageReminder === 'custom' && (
                      <input
                        type="number"
                        value={maintenanceForm.customMileageReminder}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, customMileageReminder: e.target.value })}
                        className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter custom miles (e.g., 4000)"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FileText size={16} className="mr-1" />
                  Notes
                </label>
                <textarea
                  value={maintenanceForm.notes}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Tools used, torque specs, tips, etc."
                />
              </div>

              <button
                onClick={addMaintenanceRecord}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium"
              >
                Add Maintenance Record
              </button>
            </div>
          </div>
        </div>

        {/* Maintenance History */}
        {selectedVehicle.maintenanceRecords.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Maintenance History</h3>
            <div className="space-y-3">
              {selectedVehicle.maintenanceRecords.map(record => (
                <div key={record.id} className="border rounded-lg overflow-hidden">
                  {/* Collapsed View */}
                  <div
                    onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                    className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-800">{record.serviceType}</h4>
                        <p className="text-sm text-gray-600">{record.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                          {parseInt(record.mileage).toLocaleString()} mi
                        </p>
                        <div className={`transform transition-transform ${expandedRecord === record.id ? 'rotate-180' : ''}`}>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded View */}
                  {expandedRecord === record.id && (
                    <div className="bg-white p-4 border-t border-gray-200 animate-in slide-in-from-top-2 duration-200">
                      {editingRecord === record.id ? (
                        /* Edit Form */
                        <EditRecordForm 
                          record={record} 
                          serviceTypes={serviceTypes}
                          onSave={(updatedRecord) => updateMaintenanceRecord(record.id, updatedRecord)}
                          onCancel={() => setEditingRecord(null)}
                        />
                      ) : (
                        /* Display View */
                        <div className="space-y-3">
                          {/* Action Buttons */}
                          <div className="flex justify-end space-x-2 mb-3">
                            <button
                              onClick={() => setEditingRecord(record.id)}
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
                            >
                              <Edit2 size={14} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(record.id)}
                              className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm"
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Service Date</label>
                              <p className="text-sm text-gray-800">{record.date}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mileage</label>
                              <p className="text-sm text-gray-800">{parseInt(record.mileage).toLocaleString()} miles</p>
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Service Type</label>
                            <p className="text-sm text-gray-800 bg-blue-50 px-3 py-1 rounded-full inline-block mt-1">
                              {record.serviceType}
                            </p>
                          </div>
                          
                          {record.productUsed && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Product Used</label>
                              <p className="text-sm text-gray-800">{record.productUsed}</p>
                            </div>
                          )}
                          
                          {record.reminderDate && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                                <Clock size={12} className="mr-1" />
                                Next Service Reminder (Date)
                              </label>
                              <p className="text-sm text-gray-800">{new Date(record.reminderDate).toLocaleDateString()}</p>
                            </div>
                          )}
                          
                          {record.mileageReminderValue && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                                <Bell size={12} className="mr-1" />
                                Next Service Reminder (Mileage)
                              </label>
                              <p className="text-sm text-gray-800">
                                Every {parseInt(record.mileageReminderValue).toLocaleString()} miles
                                <span className="text-gray-500 ml-2">
                                  (Next due: {(parseInt(record.mileage) + parseInt(record.mileageReminderValue)).toLocaleString()} miles)
                                </span>
                              </p>
                            </div>
                          )}
                          
                          {record.notes && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                                <FileText size={12} className="mr-1" />
                                Notes
                              </label>
                              <div className="bg-gray-50 rounded-lg p-3 mt-1">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.notes}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Camera Modal
  const renderCameraModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">
            {cameraType === 'vin' ? 'Scan VIN Barcode' : 'Scan Odometer'}
          </h3>
          <button onClick={stopCamera} className="text-red-600">
            <X size={24} />
          </button>
        </div>
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full rounded-lg mb-4"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="flex space-x-4">
          <button
            onClick={captureImage}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            Capture
          </button>
          <button
            onClick={stopCamera}
            className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Delete Confirmation Modal
  const renderDeleteConfirmModal = () => {
    const recordToDelete = selectedVehicle.maintenanceRecords.find(r => r.id === showDeleteConfirm);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Maintenance Record</h3>
            <p className="text-gray-600">
              Are you sure you want to delete this maintenance record?
            </p>
            {recordToDelete && (
              <div className="bg-red-50 rounded-lg p-3 mt-3">
                <p className="text-sm font-medium text-red-800">{recordToDelete.serviceType}</p>
                <p className="text-sm text-red-600">{recordToDelete.date} - {parseInt(recordToDelete.mileage).toLocaleString()} miles</p>
              </div>
            )}
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => deleteMaintenanceRecord(showDeleteConfirm)}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-medium"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Mileage Alert Modal
  const renderMileageAlertModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
            <AlertTriangle size={24} className="text-orange-500 mr-2" />
            Maintenance Reminders
          </h3>
          <p className="text-gray-600 text-sm">
            Based on your current mileage, you have upcoming or overdue services:
          </p>
        </div>
        
        <div className="space-y-4 mb-6">
          {mileageAlerts.map((alert, index) => (
            <div
              key={`${alert.recordId}-${index}`}
              className={`rounded-lg p-4 ${
                alert.type === 'overdue' 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-orange-50 border border-orange-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    alert.type === 'overdue' ? 'text-red-800' : 'text-orange-800'
                  }`}>
                    {alert.serviceType}
                  </h4>
                  <p className={`text-sm ${
                    alert.type === 'overdue' ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {alert.type === 'overdue' 
                      ? `Overdue by ${alert.overdueMiles.toLocaleString()} miles`
                      : `Due in ${alert.milesRemaining.toLocaleString()} miles`
                    }
                  </p>
                </div>
                <button
                  onClick={() => dismissMileageAlert(alert.recordId)}
                  className={`text-sm px-3 py-1 rounded-lg ${
                    alert.type === 'overdue'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => setShowMileageAlert(false)}
          className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700"
        >
          Close All
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {currentView === 'garage' && renderGarageView()}
      {currentView === 'addVehicle' && renderAddVehicleView()}
      {currentView === 'vehicleDetail' && renderVehicleDetailView()}
      {showCamera && renderCameraModal()}
      {showDeleteConfirm && renderDeleteConfirmModal()}
      {showMileageAlert && renderMileageAlertModal()}
    </div>
  );
};

// Edit Record Form Component
const EditRecordForm = ({ record, serviceTypes, onSave, onCancel }) => {
  const [editForm, setEditForm] = useState({
    mileage: record.mileage,
    serviceType: record.serviceType,
    productUsed: record.productUsed || '',
    notes: record.notes || '',
    reminderDate: record.reminderDate || '',
    reminderInterval: '3',
    mileageReminder: record.mileageReminderValue ? 
      (record.mileageReminderValue === '3000' || record.mileageReminderValue === '5000' || 
       record.mileageReminderValue === '7500' || record.mileageReminderValue === '10000' 
        ? record.mileageReminderValue : 'custom') : '',
    customMileageReminder: record.mileageReminderValue && 
      !['3000', '5000', '7500', '10000'].includes(record.mileageReminderValue) 
        ? record.mileageReminderValue : ''
  });

  const mileageReminderOptions = [
    { value: '3000', label: '3,000 miles' },
    { value: '5000', label: '5,000 miles' },
    { value: '7500', label: '7,500 miles' },
    { value: '10000', label: '10,000 miles' },
    { value: 'custom', label: 'Custom' }
  ];

  const handleSave = () => {
    if (editForm.mileage && editForm.serviceType) {
      const mileageReminderValue = editForm.mileageReminder === 'custom' 
        ? editForm.customMileageReminder 
        : editForm.mileageReminder;
        
      onSave({
        ...editForm,
        mileageReminderValue: mileageReminderValue,
        lastReminderTriggered: false // Reset reminder trigger when editing
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium text-gray-800">Edit Maintenance Record</h4>
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm"
          >
            <Save size={14} />
            <span>Save</span>
          </button>
          <button
            onClick={onCancel}
            className="flex items-center space-x-1 bg-gray-600 text-white px-3 py-1 rounded-lg hover:bg-gray-700 text-sm"
          >
            <X size={14} />
            <span>Cancel</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Mileage</label>
        <input
          type="number"
          value={editForm.mileage}
          onChange={(e) => setEditForm({ ...editForm, mileage: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
        <select
          value={editForm.serviceType}
          onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select service type</option>
          {serviceTypes.map(service => (
            <option key={service} value={service}>{service}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Product Used</label>
        <input
          type="text"
          value={editForm.productUsed}
          onChange={(e) => setEditForm({ ...editForm, productUsed: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Mobil 1 5W-30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Reminder Date</label>
        <input
          type="date"
          value={editForm.reminderDate}
          onChange={(e) => setEditForm({ ...editForm, reminderDate: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Mileage Reminder</label>
        <select
          value={editForm.mileageReminder}
          onChange={(e) => setEditForm({ ...editForm, mileageReminder: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No mileage reminder</option>
          {mileageReminderOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {editForm.mileageReminder === 'custom' && (
          <input
            type="number"
            value={editForm.customMileageReminder}
            onChange={(e) => setEditForm({ ...editForm, customMileageReminder: e.target.value })}
            className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter custom miles (e.g., 4000)"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          value={editForm.notes}
          onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="Tools used, torque specs, tips, etc."
        />
      </div>
    </div>
  );
};

export default VehicleMaintenanceTracker;

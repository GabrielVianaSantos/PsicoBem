import { TouchableOpacity } from "react-native";

export default function DynamicButton() { // This should be a functional component

  // Function definition for the dynamic button
  const DynamicButton = (initialContent, onPress) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedContent, setExpandedContent] = useState(initialContent);

    const handleButtonClick = () => {
      setIsExpanded(!isExpanded);
      if (isExpanded) {
        setExpandedContent('');
      } else {
        // Update content dynamically here if needed (optional)
        // For example: setExpandedContent('New expanded content');
      }
    };

    return (
      <>
        <TouchableOpacity onPress={onPress || handleButtonClick}>
          {isExpanded ? (
            <Ionicons name="arrow-down" size={24} color="#11B5A4" />
          ) : (
            <Ionicons name="arrow-right" size={24} color="#11B5A4" />
          )}
        </TouchableOpacity>
        <ExpandableSection expandedContent={expandedContent} />
      </>
    );
  };

  // How to use the DynamicButton function within the component
  return (
    <View>
      {/* Pass initial content and optional onPress handler here */}
      <DynamicButton initialContent="Initial Text" onPress={() => { /* Your button press logic */ }} />
    </View>
  );
}
